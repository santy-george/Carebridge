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
                    "recorded_at": self.isoFormatter.string(from: reading.recordedAt),
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
