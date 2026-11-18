package com.carebridgehome.wellness

import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Which local calendar days to re-send step totals for. Always yesterday and
 * today (the server upserts one total per day, so re-sending is harmless);
 * after an outage, every day the heart-rate catch-up window covers too, so a
 * gap longer than two days doesn't leave days without a total.
 */
object StepDays {
    fun days(now: Instant, lookback: Duration, zone: ZoneId): List<LocalDate> {
        val today = now.atZone(zone).toLocalDate()
        val earliest = minOf(today.minusDays(1), now.minus(lookback).atZone(zone).toLocalDate())
        return generateSequence(earliest) { it.plusDays(1) }.takeWhile { !it.isAfter(today) }.toList()
    }
}
