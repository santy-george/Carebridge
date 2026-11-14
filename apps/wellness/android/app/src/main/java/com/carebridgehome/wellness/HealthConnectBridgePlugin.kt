package com.carebridgehome.wellness

import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.reflect.KClass

/**
 * Read-only Health Connect integration. Mirrors the iOS HealthKitBridge: it
 * emits the same `healthKitSamples` / `healthKitSleepSessions` events so the
 * web layer's queue and ingest-wearable upload are shared. Never writes.
 *
 * Health Connect has no observer push to a backgrounded app, so data is pulled
 * on startObserving() and syncNow() (the web layer calls the latter on resume).
 * Each sync re-reads a fixed trailing window with no saved position: the server
 * drops rows it already has, so a crash or failed upload between "read" and
 * "stored" can never lose data. Syncs are throttled to keep that cheap.
 */
@CapacitorPlugin(name = "HealthConnectBridge")
class HealthConnectBridgePlugin : Plugin() {

    private companion object {
        const val TAG = "HealthConnectBridge"
        val MIN_SYNC_INTERVAL: Duration = Duration.ofMinutes(10)
        val LOOKBACK_FAST: Duration = Duration.ofHours(24)
        val LOOKBACK_SLOW: Duration = Duration.ofDays(7)
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val syncLock = Mutex()

    @Volatile
    private var lastSyncAt: Instant = Instant.EPOCH

    private val readPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(OxygenSaturationRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(RespiratoryRateRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
    )

    private fun client(): HealthConnectClient? =
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }

    @PluginMethod
    fun requestAuthorization(call: PluginCall) {
        val client = client()
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            val granted = client.permissionController.getGrantedPermissions()
            if (granted.containsAll(readPermissions)) {
                call.resolve(JSObject().put("granted", true))
                return@launch
            }
            val intent = PermissionController.createRequestPermissionResultContract()
                .createIntent(context, readPermissions)
            activity.runOnUiThread { startActivityForResult(call, intent, "permissionResult") }
        }
    }

    @ActivityCallback
    private fun permissionResult(call: PluginCall?, @Suppress("UNUSED_PARAMETER") result: ActivityResult) {
        if (call == null) return
        val client = client()
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            // Re-read rather than trust the result: partial grants are normal,
            // and any one of the types is enough to start syncing.
            val granted = client.permissionController.getGrantedPermissions()
            call.resolve(JSObject().put("granted", granted.any { it in readPermissions }))
        }
    }

    @PluginMethod
    fun startObserving(call: PluginCall) {
        scope.launch { sync(force = true) }
        call.resolve()
    }

    @PluginMethod
    fun syncNow(call: PluginCall) {
        scope.launch { sync() }
        call.resolve()
    }

    private suspend fun sync(force: Boolean = false) {
        val client = client() ?: return
        if (!force && Duration.between(lastSyncAt, Instant.now()) < MIN_SYNC_INTERVAL) return
        if (!syncLock.tryLock()) return
        try {
            lastSyncAt = Instant.now()
            val granted = client.permissionController.getGrantedPermissions()
            val readings = JSArray()
            val sessions = JSArray()
            val now = Instant.now()

            fun allowed(type: KClass<out Record>) =
                HealthPermission.getReadPermission(type) in granted

            // One data type failing (a malformed record from the source app, a
            // transient provider error) must not take down the others, or the app.
            suspend fun guarded(name: String, block: suspend () -> Unit) {
                try {
                    block()
                } catch (e: Exception) {
                    Log.e(TAG, "Health Connect sync failed for $name: ${e.javaClass.simpleName}")
                }
            }

            if (allowed(HeartRateRecord::class)) guarded("heart_rate") { syncHeartRate(client, now, readings) }
            if (allowed(OxygenSaturationRecord::class)) guarded("spo2") { syncSpo2(client, now, readings) }
            if (allowed(RestingHeartRateRecord::class)) guarded("resting_heart_rate") { syncRestingHeartRate(client, now, readings) }
            if (allowed(RespiratoryRateRecord::class)) guarded("respiratory_rate") { syncRespiratoryRate(client, now, readings) }
            if (allowed(HeartRateVariabilityRmssdRecord::class)) guarded("hrv") { syncHrv(client, now, readings) }
            if (allowed(StepsRecord::class)) guarded("steps") { syncSteps(client, now, readings) }
            if (allowed(SleepSessionRecord::class)) guarded("sleep") { syncSleep(client, now, sessions) }

            if (readings.length() > 0) {
                notifyListeners("healthKitSamples", JSObject().put("readings", readings))
            }
            if (sessions.length() > 0) {
                notifyListeners("healthKitSleepSessions", JSObject().put("sessions", sessions))
            }
        } finally {
            syncLock.unlock()
        }
    }

    private suspend fun <T : Record> readAll(
        client: HealthConnectClient,
        type: KClass<T>,
        from: Instant,
        to: Instant,
    ): List<T> {
        val out = mutableListOf<T>()
        var pageToken: String? = null
        do {
            val response = client.readRecords(
                ReadRecordsRequest(
                    recordType = type,
                    timeRangeFilter = TimeRangeFilter.between(from, to),
                    pageSize = 5000,
                    pageToken = pageToken,
                ),
            )
            out += response.records
            pageToken = response.pageToken
        } while (pageToken != null)
        return out
    }

    private fun reading(type: String, value: Double, at: Instant): JSObject =
        JSObject().put("reading_type", type).put("value", value).put("recorded_at", at.toString())

    // The watch writes about one heart-rate sample a minute. Averaging into
    // five-minute buckets keeps a day to ~288 rows instead of ~1,440. Only
    // buckets that have fully ended are sent, so a bucket's average is final
    // and a repeat of it has an identical timestamp for the server to drop.
    private suspend fun syncHeartRate(client: HealthConnectClient, now: Instant, out: JSArray) {
        val bucketSeconds = 300L
        val from = now.minus(LOOKBACK_FAST)
        val openBucketStart = Instant.ofEpochSecond(now.epochSecond / bucketSeconds * bucketSeconds)

        val buckets = sortedMapOf<Long, MutableList<Long>>()
        for (record in readAll(client, HeartRateRecord::class, from, openBucketStart)) {
            for (sample in record.samples) {
                val bucket = sample.time.epochSecond / bucketSeconds * bucketSeconds
                if (sample.time.isBefore(from) || bucket >= openBucketStart.epochSecond) continue
                buckets.getOrPut(bucket) { mutableListOf() }.add(sample.beatsPerMinute)
            }
        }
        for ((bucket, values) in buckets) {
            out.put(reading("heart_rate", values.average(), Instant.ofEpochSecond(bucket)))
        }
    }

    private suspend fun syncSpo2(client: HealthConnectClient, now: Instant, out: JSArray) {
        val from = now.minus(LOOKBACK_SLOW)
        for (r in readAll(client, OxygenSaturationRecord::class, from, now)) {
            out.put(reading("spo2", r.percentage.value, r.time))
        }
    }

    private suspend fun syncRestingHeartRate(client: HealthConnectClient, now: Instant, out: JSArray) {
        val from = now.minus(LOOKBACK_SLOW)
        for (r in readAll(client, RestingHeartRateRecord::class, from, now)) {
            out.put(reading("resting_heart_rate", r.beatsPerMinute.toDouble(), r.time))
        }
    }

    private suspend fun syncRespiratoryRate(client: HealthConnectClient, now: Instant, out: JSArray) {
        val from = now.minus(LOOKBACK_SLOW)
        for (r in readAll(client, RespiratoryRateRecord::class, from, now)) {
            out.put(reading("respiratory_rate", r.rate, r.time))
        }
    }

    private suspend fun syncHrv(client: HealthConnectClient, now: Instant, out: JSArray) {
        val from = now.minus(LOOKBACK_SLOW)
        for (r in readAll(client, HeartRateVariabilityRmssdRecord::class, from, now)) {
            out.put(reading("heart_rate_variability_rmssd", r.heartRateVariabilityMillis, r.time))
        }
    }

    // Daily cumulative: the server upserts one total per day, so today and
    // yesterday are re-sent every sync with no cursor. Each total is stamped at
    // local noon, so the server's UTC date slice lands on the member's local
    // calendar day (IST is UTC+5:30; a midnight stamp would slip a day).
    private suspend fun syncSteps(client: HealthConnectClient, now: Instant, out: JSArray) {
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        // Aggregate rather than read raw records: Health Connect de-duplicates
        // overlapping sources itself, and Google Health writes some zero-length
        // step records that the record reader throws on.
        for (day in listOf(today.minusDays(1), today)) {
            val start = day.atStartOfDay(zone).toInstant()
            val end = minOf(day.plusDays(1).atStartOfDay(zone).toInstant(), now)
            if (!end.isAfter(start)) continue
            val total = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                ),
            )[StepsRecord.COUNT_TOTAL] ?: continue
            out.put(reading("step_count", total.toDouble(), day.atTime(12, 0).atZone(zone).toInstant()))
        }
    }

    private suspend fun syncSleep(client: HealthConnectClient, now: Instant, out: JSArray) {
        val from = now.minus(Duration.ofDays(3))
        for (session in readAll(client, SleepSessionRecord::class, from, now)) {
            if (session.stages.isEmpty()) {
                out.put(sleepRow(session.startTime, session.endTime, "in_bed"))
            } else {
                for (stage in session.stages) {
                    val mapped = mapSleepStage(stage.stage) ?: continue
                    out.put(sleepRow(stage.startTime, stage.endTime, mapped))
                }
            }
        }
    }

    private fun sleepRow(start: Instant, end: Instant, stage: String): JSObject =
        JSObject()
            .put("started_at", start.toString())
            .put("ended_at", end.toString())
            .put("stage", stage)

    private fun mapSleepStage(stage: Int): String? = when (stage) {
        SleepSessionRecord.STAGE_TYPE_AWAKE,
        SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> "awake"
        SleepSessionRecord.STAGE_TYPE_LIGHT,
        SleepSessionRecord.STAGE_TYPE_SLEEPING -> "asleep_core"
        SleepSessionRecord.STAGE_TYPE_DEEP -> "asleep_deep"
        SleepSessionRecord.STAGE_TYPE_REM -> "asleep_rem"
        else -> null // out-of-bed and unknown carry no sleep information
    }
}
