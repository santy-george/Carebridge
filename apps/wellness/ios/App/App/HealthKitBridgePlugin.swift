import Foundation
import Capacitor

@objc(HealthKitBridgePlugin)
public class HealthKitBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitBridgePlugin"
    public let jsName = "HealthKitBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startObserving", returnType: CAPPluginReturnPromise),
    ]

    private let healthKitBridge = HealthKitBridge()
    private let isoFormatter = ISO8601DateFormatter()

    // Daily-cumulative reading_types (see ingest-wearable) are bucketed by
    // calendar day, derived server-side from recorded_at via a plain
    // string slice -- so they must be sent as an already-local
    // "yyyy-MM-dd" date, never as a UTC-instant ISO8601 string. Any
    // positive UTC offset (India included, this app's actual market) makes
    // local midnight fall on the PREVIOUS UTC calendar day, so the naive
    // "serialize as UTC, slice the date" approach silently files today's
    // total under yesterday.
    private static let dailyCumulativeReadingTypes: Set<String> = [
        "step_count", "active_energy_burned", "distance_walked_running", "apple_stand_time",
    ]
    private let localDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.calendar = .current
        formatter.timeZone = .current
        return formatter
    }()

    private func recordedAtString(for reading: HealthKitReading) -> String {
        if Self.dailyCumulativeReadingTypes.contains(reading.readingType) {
            return localDateFormatter.string(from: reading.recordedAt)
        }
        return isoFormatter.string(from: reading.recordedAt)
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        healthKitBridge.requestAuthorization { granted, error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func startObserving(_ call: CAPPluginCall) {
        healthKitBridge.startObserving { [weak self] readings in
            guard let self else { return }
            let payload = readings.map { reading -> [String: Any] in
                [
                    "reading_type": reading.readingType,
                    "value": reading.value,
                    "recorded_at": self.recordedAtString(for: reading),
                ]
            }
            self.notifyListeners("healthKitSamples", data: ["readings": payload])
        }

        healthKitBridge.startObservingSleep { [weak self] sessions in
            guard let self else { return }
            let payload = sessions.map { session -> [String: Any] in
                [
                    "started_at": self.isoFormatter.string(from: session.startedAt),
                    "ended_at": self.isoFormatter.string(from: session.endedAt),
                    "stage": session.stage,
                ]
            }
            self.notifyListeners("healthKitSleepSessions", data: ["sessions": payload])
        }

        healthKitBridge.startObservingEcg { [weak self] readings in
            guard let self else { return }
            let payload = readings.map { reading -> [String: Any] in
                var row: [String: Any] = [
                    "recorded_at": self.isoFormatter.string(from: reading.recordedAt),
                    "classification": reading.classification,
                ]
                if let avgHr = reading.averageHeartRate {
                    row["average_heart_rate"] = avgHr
                }
                return row
            }
            self.notifyListeners("healthKitEcgReadings", data: ["readings": payload])
        }

        healthKitBridge.startObservingRhythmEvents { [weak self] events in
            guard let self else { return }
            let payload = events.map { event -> [String: Any] in
                ["recorded_at": self.isoFormatter.string(from: event.recordedAt)]
            }
            self.notifyListeners("healthKitRhythmEvents", data: ["events": payload])
        }

        call.resolve()
    }
}
