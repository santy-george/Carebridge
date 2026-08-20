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
        call.resolve()
    }
}
