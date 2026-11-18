package com.carebridgehome.wellness

import java.time.Duration
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class HeartRateWindowTest {
    private val now = Instant.parse("2026-11-18T14:00:00Z")
    private val floor = Duration.ofHours(6)

    @Test
    fun `no stored heart rate yet reads only the floor window`() {
        assertEquals(floor, HeartRateWindow.lookback(now, null, floor))
    }

    @Test
    fun `a recent upload keeps the floor window`() {
        val newest = now.minus(Duration.ofHours(2))
        assertEquals(floor, HeartRateWindow.lookback(now, newest, floor))
    }

    @Test
    fun `after a three-day gap reads back to the newest stored bucket plus overlap`() {
        val newest = now.minus(Duration.ofDays(3))
        assertEquals(Duration.ofDays(3).plusHours(1), HeartRateWindow.lookback(now, newest, floor))
    }

    @Test
    fun `a very long gap is capped`() {
        val newest = now.minus(Duration.ofDays(40))
        assertEquals(HeartRateWindow.MAX_LOOKBACK, HeartRateWindow.lookback(now, newest, floor))
    }

    @Test
    fun `a stored time in the future falls back to the floor`() {
        val newest = now.plus(Duration.ofDays(1))
        assertEquals(floor, HeartRateWindow.lookback(now, newest, floor))
    }

    @Test
    fun `an upload without heart rate leaves the marker where it was`() {
        val old = Instant.parse("2026-11-15T06:30:00Z")
        assertEquals(old, HeartRateWindow.advance(old, null))
    }

    @Test
    fun `the marker only moves forward`() {
        val old = Instant.parse("2026-11-15T06:30:00Z")
        val newer = Instant.parse("2026-11-18T13:00:00Z")
        assertEquals(newer, HeartRateWindow.advance(old, newer))
        assertEquals(newer, HeartRateWindow.advance(newer, old))
        assertEquals(newer, HeartRateWindow.advance(null, newer))
    }
}
