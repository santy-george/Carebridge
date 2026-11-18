package com.carebridgehome.wellness

import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class StepDaysTest {
    private val ist = ZoneId.of("Asia/Kolkata")
    private val now = Instant.parse("2026-11-18T14:00:00Z") // 19:30 IST, Nov 18

    @Test
    fun `a short window still re-sends yesterday and today`() {
        assertEquals(
            listOf(LocalDate.of(2026, 11, 17), LocalDate.of(2026, 11, 18)),
            StepDays.days(now, Duration.ofHours(6), ist),
        )
    }

    @Test
    fun `a catch-up window re-sends every day it covers`() {
        // 81h back from 19:30 IST Nov 18 is 10:30 IST Nov 15.
        assertEquals(
            (15..18).map { LocalDate.of(2026, 11, it) },
            StepDays.days(now, Duration.ofHours(81), ist),
        )
    }

    @Test
    fun `the 7-day cap gives eight calendar days at most`() {
        val days = StepDays.days(now, HeartRateWindow.MAX_LOOKBACK, ist)
        assertEquals(LocalDate.of(2026, 11, 11), days.first())
        assertEquals(LocalDate.of(2026, 11, 18), days.last())
        assertEquals(8, days.size)
    }
}
