package com.carebridgehome.wellness

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
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
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.reflect.KClass

/**
 * Reads Health Connect into the ingest-wearable payload shape. Shared by the
 * foreground plugin (which hands the result to the web layer) and the
 * background worker (which uploads it itself). Read-only.
 *
 * Every read covers a trailing window and the server drops rows it already
 * has, so a crash or failed upload between "read" and "stored" can never lose
 * data. Heart rate's window stretches after an outage (see HeartRateWindow);
 * its marker only moves once the server has accepted the rows.
 */
object HealthConnectReader {
    private const val TAG = "HealthConnectReader"
    private val HR_SETTLE: Duration = Duration.ofMinutes(60)
    private val LOOKBACK_SLOW: Duration = Duration.ofDays(7)
    private val LOOKBACK_SLEEP: Duration = Duration.ofDays(3)

    val readPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(OxygenSaturationRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(RespiratoryRateRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
    )

    fun client(context: Context): HealthConnectClient? =
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(context)
        } else {
            null
        }

    class Batch(val readings: JSArray, val sessions: JSArray, val newestHeartRate: Instant?) {
        val isEmpty get() = readings.length() == 0 && sessions.length() == 0
    }

    /** heartRateLookback: how far back to re-read heart rate (the bulkiest type). */
    suspend fun read(client: HealthConnectClient, heartRateLookback: Duration): Batch {
        val granted = client.permissionController.getGrantedPermissions()
        val readings = JSArray()
        val sessions = JSArray()
        val now = Instant.now()

        fun allowed(type: KClass<out Record>) = HealthPermission.getReadPermission(type) in granted

        // One data type failing (a malformed record from the source app, a
        // transient provider error) must not take down the others, or the app.
        suspend fun guarded(name: String, block: suspend () -> Unit) {
            try {
                block()
            } catch (e: Exception) {
                Log.e(TAG, "Health Connect read failed for $name: ${e.javaClass.simpleName}")
            }
        }

        var newestHeartRate: Instant? = null
        if (allowed(HeartRateRecord::class)) {
            guarded("heart_rate") { newestHeartRate = heartRate(client, now, heartRateLookback, readings) }
        }
        if (allowed(OxygenSaturationRecord::class)) guarded("spo2") { spo2(client, now, readings) }
        if (allowed(RestingHeartRateRecord::class)) guarded("resting_heart_rate") { restingHeartRate(client, now, readings) }
        if (allowed(RespiratoryRateRecord::class)) guarded("respiratory_rate") { respiratoryRate(client, now, readings) }
        if (allowed(HeartRateVariabilityRmssdRecord::class)) guarded("hrv") { hrv(client, now, readings) }
        if (allowed(StepsRecord::class)) guarded("steps") { steps(client, now, readings) }
        if (allowed(SleepSessionRecord::class)) guarded("sleep") { sleep(client, now, sessions) }
        // Counts only, never values: enough to tell "Health Connect had nothing"
        // from "the sync never ran" when data stops arriving.
        val counts = mutableMapOf<String, Int>()
        for (i in 0 until readings.length()) {
            val type = readings.getJSONObject(i).optString("reading_type")
            counts[type] = (counts[type] ?: 0) + 1
        }
        Log.i(TAG, "read hrLookback=${heartRateLookback.toHours()}h readings=$counts sleepRows=${sessions.length()}")
        return Batch(readings, sessions, newestHeartRate)
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
    // five-minute buckets keeps a day to ~288 rows instead of ~1,440. The
    // server keeps the first copy of a bucket, so a bucket is only sent once
    // its average is final: the watch reaches Health Connect in batches,
    // ~20 minutes behind on the Versa 4, so buckets newer than HR_SETTLE are
    // left for a later sync rather than sent half-filled.
    // Returns the newest bucket sent, or null if none.
    private suspend fun heartRate(client: HealthConnectClient, now: Instant, lookback: Duration, out: JSArray): Instant? {
        val bucketSeconds = 300L
        val from = now.minus(lookback)
        val settled = now.minus(HR_SETTLE)
        val openBucketStart = Instant.ofEpochSecond(settled.epochSecond / bucketSeconds * bucketSeconds)
        if (!from.isBefore(openBucketStart)) return null

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
        return if (buckets.isEmpty()) null else Instant.ofEpochSecond(buckets.lastKey())
    }

    private suspend fun spo2(client: HealthConnectClient, now: Instant, out: JSArray) {
        for (r in readAll(client, OxygenSaturationRecord::class, now.minus(LOOKBACK_SLOW), now)) {
            out.put(reading("spo2", r.percentage.value, r.time))
        }
    }

    private suspend fun restingHeartRate(client: HealthConnectClient, now: Instant, out: JSArray) {
        for (r in readAll(client, RestingHeartRateRecord::class, now.minus(LOOKBACK_SLOW), now)) {
            out.put(reading("resting_heart_rate", r.beatsPerMinute.toDouble(), r.time))
        }
    }

    private suspend fun respiratoryRate(client: HealthConnectClient, now: Instant, out: JSArray) {
        for (r in readAll(client, RespiratoryRateRecord::class, now.minus(LOOKBACK_SLOW), now)) {
            out.put(reading("respiratory_rate", r.rate, r.time))
        }
    }

    private suspend fun hrv(client: HealthConnectClient, now: Instant, out: JSArray) {
        for (r in readAll(client, HeartRateVariabilityRmssdRecord::class, now.minus(LOOKBACK_SLOW), now)) {
            out.put(reading("heart_rate_variability_rmssd", r.heartRateVariabilityMillis, r.time))
        }
    }

    // Daily cumulative: the server upserts one total per day, so today and
    // yesterday are re-sent every sync. Each total is stamped at local noon,
    // so the server's UTC date slice lands on the member's local calendar day
    // (IST is UTC+5:30; a midnight stamp would slip a day).
    private suspend fun steps(client: HealthConnectClient, now: Instant, out: JSArray) {
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

    private suspend fun sleep(client: HealthConnectClient, now: Instant, out: JSArray) {
        for (session in readAll(client, SleepSessionRecord::class, now.minus(LOOKBACK_SLEEP), now)) {
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
