package com.carebridgehome.wellness

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.PermissionController
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex

/**
 * Read-only Health Connect integration. Mirrors the iOS HealthKitBridge: in
 * the foreground it emits the same `healthKitSamples` / `healthKitSleepSessions`
 * events so the web layer's queue and ingest-wearable upload are shared.
 * Never writes.
 *
 * Health Connect cannot push to a backgrounded app, so the foreground pulls on
 * startObserving() and syncNow() (called on resume), and BackgroundSync's
 * WorkManager job uploads every 15 minutes when the app is closed.
 */
@CapacitorPlugin(name = "HealthConnectBridge")
class HealthConnectBridgePlugin : Plugin() {

    private companion object {
        val MIN_SYNC_INTERVAL: Duration = Duration.ofMinutes(10)
        val HEART_RATE_LOOKBACK: Duration = Duration.ofHours(24)
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val syncLock = Mutex()

    @Volatile
    private var lastSyncAt: Instant = Instant.EPOCH

    // The read types, plus background read where this Health Connect supports
    // it (Android 14+ / recent provider builds); asked for in the same dialog.
    private fun requestedPermissions(): Set<String> =
        if (BackgroundSync.isBackgroundReadAvailable(context)) {
            HealthConnectReader.readPermissions + BackgroundSync.backgroundPermission
        } else {
            HealthConnectReader.readPermissions
        }

    @PluginMethod
    fun requestAuthorization(call: PluginCall) {
        val client = HealthConnectReader.client(context)
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            val wanted = requestedPermissions()
            val granted = client.permissionController.getGrantedPermissions()
            if (granted.containsAll(wanted)) {
                call.resolve(JSObject().put("granted", true))
                return@launch
            }
            val intent = PermissionController.createRequestPermissionResultContract()
                .createIntent(context, wanted)
            activity.runOnUiThread { startActivityForResult(call, intent, "permissionResult") }
        }
    }

    @ActivityCallback
    private fun permissionResult(call: PluginCall?, @Suppress("UNUSED_PARAMETER") result: ActivityResult) {
        if (call == null) return
        val client = HealthConnectReader.client(context)
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            // Re-read rather than trust the result: partial grants are normal,
            // and any one of the types is enough to start syncing.
            val granted = client.permissionController.getGrantedPermissions()
            call.resolve(JSObject().put("granted", granted.any { it in HealthConnectReader.readPermissions }))
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

    /** Schedules the background job with a device key from register-wearable-device. */
    @PluginMethod
    fun enableBackgroundSync(call: PluginCall) {
        val url = call.getString("supabaseUrl")
        val anonKey = call.getString("anonKey")
        val memberId = call.getString("memberId")
        val token = call.getString("deviceToken")
        if (url.isNullOrBlank() || anonKey.isNullOrBlank() || memberId.isNullOrBlank() || token.isNullOrBlank()) {
            call.reject("supabaseUrl, anonKey, memberId and deviceToken are required")
            return
        }
        BackgroundSync.enable(context, BackgroundSync.Config(url, anonKey, memberId, token))
        call.resolve()
    }

    /** Stops the job and forgets the device key (sign-out). */
    @PluginMethod
    fun disableBackgroundSync(call: PluginCall) {
        BackgroundSync.disable(context)
        call.resolve()
    }

    @PluginMethod
    fun backgroundSyncStatus(call: PluginCall) {
        val config = BackgroundSync.load(context)
        val client = HealthConnectReader.client(context)
        scope.launch {
            val permitted = client?.permissionController?.getGrantedPermissions()
                ?.contains(BackgroundSync.backgroundPermission) ?: false
            call.resolve(
                JSObject()
                    .put("enabledForMemberId", config?.memberId)
                    .put("backgroundPermission", permitted),
            )
        }
    }

    private suspend fun sync(force: Boolean = false) {
        val client = HealthConnectReader.client(context) ?: return
        if (!force && Duration.between(lastSyncAt, Instant.now()) < MIN_SYNC_INTERVAL) return
        if (!syncLock.tryLock()) return
        try {
            lastSyncAt = Instant.now()
            val batch = HealthConnectReader.read(client, HEART_RATE_LOOKBACK)
            if (batch.readings.length() > 0) {
                notifyListeners("healthKitSamples", JSObject().put("readings", batch.readings))
            }
            if (batch.sessions.length() > 0) {
                notifyListeners("healthKitSleepSessions", JSObject().put("sessions", batch.sessions))
            }
        } finally {
            syncLock.unlock()
        }
    }
}
