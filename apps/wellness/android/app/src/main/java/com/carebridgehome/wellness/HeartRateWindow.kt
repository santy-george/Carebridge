package com.carebridgehome.wellness

import java.time.Duration
import java.time.Instant

/**
 * How far back to re-read heart rate. Normally a short trailing window, but
 * after an outage (watch off, Fitbit app not syncing) it reaches back to the
 * newest heart-rate bucket the server is known to hold, so the gap is filled
 * once the data turns up in Health Connect.
 *
 * The marker is the newest heart-rate bucket in an upload the server accepted,
 * not the time of the last sync: during an outage syncs keep succeeding with no
 * heart rate in them, and must not move the marker.
 */
object HeartRateWindow {
    /** Bounds a single catch-up upload (~2,000 five-minute buckets). */
    val MAX_LOOKBACK: Duration = Duration.ofDays(7)

    /** Re-covers buckets around the marker; the server drops the duplicates. */
    private val OVERLAP: Duration = Duration.ofHours(1)

    fun lookback(now: Instant, newestStored: Instant?, floor: Duration): Duration {
        if (newestStored == null || newestStored.isAfter(now)) return floor
        val gap = Duration.between(newestStored, now).plus(OVERLAP)
        return when {
            gap < floor -> floor
            gap > MAX_LOOKBACK -> MAX_LOOKBACK
            else -> gap
        }
    }

    fun advance(current: Instant?, uploadedNewest: Instant?): Instant? = when {
        uploadedNewest == null -> current
        current == null || uploadedNewest.isAfter(current) -> uploadedNewest
        else -> current
    }
}
