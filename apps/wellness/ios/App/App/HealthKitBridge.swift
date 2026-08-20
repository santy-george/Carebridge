import Foundation
import HealthKit

struct HealthKitReading {
    let readingType: String
    let value: Double
    let recordedAt: Date
}

final class HealthKitBridge {
    private let store = HKHealthStore()
    private let heartRateType = HKQuantityType(.heartRate)
    private let spo2Type = HKQuantityType(.oxygenSaturation)

    // Anchors persist which samples have already been emitted, so a
    // relaunch resumes from the last-seen sample instead of re-emitting
    // history. UserDefaults is the same underlying storage Capacitor's own
    // Preferences plugin uses on iOS -- this just talks to it directly
    // rather than round-tripping the JS bridge for an internal detail.
    private let defaults = UserDefaults.standard
    private func anchorKey(for type: HKQuantityType) -> String {
        "healthkit_anchor_\(type.identifier)"
    }

    private func loadAnchor(for type: HKQuantityType) -> HKQueryAnchor? {
        guard let data = defaults.data(forKey: anchorKey(for: type)) else { return nil }
        return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
    }

    private func saveAnchor(_ anchor: HKQueryAnchor?, for type: HKQuantityType) {
        guard let anchor = anchor,
              let data = try? NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
        else { return }
        defaults.set(data, forKey: anchorKey(for: type))
    }

    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, nil)
            return
        }
        let readTypes: Set<HKObjectType> = [heartRateType, spo2Type]
        store.requestAuthorization(toShare: [], read: readTypes) { granted, error in
            completion(granted, error)
        }
    }

    // Calls back on every new batch of samples for either type, forever,
    // until the process ends -- background delivery wakes the app for this.
    func startObserving(onBatch: @escaping ([HealthKitReading]) -> Void) {
        observe(type: heartRateType, readingType: "heart_rate", onBatch: onBatch)
        observe(type: spo2Type, readingType: "spo2", onBatch: onBatch)
    }

    private func observe(type: HKQuantityType, readingType: String, onBatch: @escaping ([HealthKitReading]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewSamples(type: type, readingType: readingType, onBatch: onBatch)
            completionHandler()
        }
        store.execute(observerQuery)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func fetchNewSamples(
        type: HKQuantityType,
        readingType: String,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        let anchor = loadAnchor(for: type)
        let query = HKAnchoredObjectQuery(
            type: type,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else { return }

            let unit: HKUnit = readingType == "heart_rate"
                ? HKUnit.count().unitDivided(by: .minute())
                : HKUnit.percent()
            let scale = readingType == "spo2" ? 100.0 : 1.0 // fraction -> percent

            let readings = quantitySamples.map {
                HealthKitReading(
                    readingType: readingType,
                    value: $0.quantity.doubleValue(for: unit) * scale,
                    recordedAt: $0.startDate
                )
            }
            self.saveAnchor(newAnchor, for: type)
            onBatch(readings)
        }
        store.execute(query)
    }
}
