package com.carebridgehome.wellness

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.getcapacitor.JSObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * Background Health Connect upload. Runs every 15 minutes (WorkManager's
 * floor) whether or not the app is open, using a device upload key issued by
 * the register-wearable-device function, never the app's session: Supabase
 * refresh tokens rotate, and two holders of one session log each other out.
 *
 * The key, the member it uploads for, and the project URL/anon key live in
 * app-private SharedPreferences. A 401/403 means the key was replaced, revoked
 * or the member link changed: the job clears itself rather than retrying.
 */
object BackgroundSync {
    private const val TAG = "BackgroundSync"
    private const val PREFS = "health_connect_background"
    private const val WORK_NAME = "health-connect-background-sync"

    data class Config(val supabaseUrl: String, val anonKey: String, val memberId: String, val deviceToken: String)

    val backgroundPermission: String = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

    fun isBackgroundReadAvailable(context: Context): Boolean {
        val client = HealthConnectReader.client(context) ?: return false
        return client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
            HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
    }

    fun load(context: Context): Config? {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val url = p.getString("supabase_url", null) ?: return null
        val anon = p.getString("anon_key", null) ?: return null
        val member = p.getString("member_id", null) ?: return null
        val token = p.getString("device_token", null) ?: return null
        return Config(url, anon, member, token)
    }

    fun enable(context: Context, config: Config) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("supabase_url", config.supabaseUrl)
            .putString("anon_key", config.anonKey)
            .putString("member_id", config.memberId)
            .putString("device_token", config.deviceToken)
            .apply()
        val request = PeriodicWorkRequestBuilder<HealthConnectSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        // UPDATE keeps the schedule if already enqueued, picking up the new config.
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    // Newest heart-rate bucket the server accepted, per member: a different
    // member on this phone must not inherit another member's position.
    fun newestStoredHeartRate(context: Context, memberId: String): Instant? {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (p.getString("hr_marker_member_id", null) != memberId) return null
        val millis = p.getLong("hr_marker_epoch_ms", -1L)
        return if (millis < 0) null else Instant.ofEpochMilli(millis)
    }

    fun recordStoredHeartRate(context: Context, memberId: String, uploadedNewest: Instant?) {
        val next = HeartRateWindow.advance(newestStoredHeartRate(context, memberId), uploadedNewest) ?: return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("hr_marker_member_id", memberId)
            .putLong("hr_marker_epoch_ms", next.toEpochMilli())
            .apply()
    }

    fun disable(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }

    /** Uploads one batch. Returns the HTTP status (or -1 on a network error). */
    fun upload(config: Config, batch: HealthConnectReader.Batch): Int {
        val body = JSObject()
            .put("member_id", config.memberId)
            .put("device_vendor", "health_connect")
            .put("readings", batch.readings)
            .put("sleep_sessions", batch.sessions)
        return try {
            val conn = URL("${config.supabaseUrl}/functions/v1/ingest-wearable").openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer ${config.anonKey}")
            conn.setRequestProperty("apikey", config.anonKey)
            conn.setRequestProperty("x-device-token", config.deviceToken)
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val status = conn.responseCode
            conn.disconnect()
            status
        } catch (e: Exception) {
            Log.w(TAG, "upload failed: ${e.javaClass.simpleName}")
            -1
        }
    }
}

class HealthConnectSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val config = BackgroundSync.load(applicationContext) ?: return Result.success()
        val client = HealthConnectReader.client(applicationContext) ?: return Result.success()
        val granted = client.permissionController.getGrantedPermissions()
        // Without the background-read permission every read would throw; the
        // foreground app still syncs on open, so there is nothing to retry.
        if (BackgroundSync.backgroundPermission !in granted) return Result.success()

        // Heart rate settles for an hour before it is sent, so a 6-hour window
        // re-covers several runs' worth while keeping each upload small; after
        // an outage the window reaches back to the last stored bucket instead.
        val lookback = HeartRateWindow.lookback(
            Instant.now(),
            BackgroundSync.newestStoredHeartRate(applicationContext, config.memberId),
            Duration.ofHours(6),
        )
        val batch = HealthConnectReader.read(client, lookback)
        if (batch.isEmpty) return Result.success()

        return when (val status = BackgroundSync.upload(config, batch)) {
            in 200..299 -> {
                BackgroundSync.recordStoredHeartRate(applicationContext, config.memberId, batch.newestHeartRate)
                Result.success()
            }
            401, 403 -> {
                Log.w("BackgroundSync", "device key rejected ($status); disabling background sync")
                BackgroundSync.disable(applicationContext)
                Result.success()
            }
            else -> Result.retry()
        }
    }
}
