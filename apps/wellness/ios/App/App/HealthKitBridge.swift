import Foundation
import HealthKit

struct HealthKitReading {
    let readingType: String
    let value: Double
    let recordedAt: Date
}

private struct QuantityTypeConfig {
    let type: HKQuantityType
    let unit: HKUnit
    let scale: Double // applied after unit conversion, e.g. fraction -> percent
}

final class HealthKitBridge {
    private let store = HKHealthStore()

    // Streaming types: passively recorded samples, emitted individually via
    // an anchored-object query as they arrive (same shape HR/SpO2 already
    // used). Daily-cumulative, category, and ECG types have their own query
    // shapes -- see HealthKitBridge+Expansion.swift.
    private lazy var streamingConfigs: [String: QuantityTypeConfig] = [
        "heart_rate": QuantityTypeConfig(
            type: HKQuantityType(.heartRate),
            unit: HKUnit.count().unitDivided(by: .minute()),
            scale: 1.0
        ),
        "spo2": QuantityTypeConfig(
            type: HKQuantityType(.oxygenSaturation),
            unit: HKUnit.percent(),
            scale: 100.0
        ),
        "heart_rate_variability_sdnn": QuantityTypeConfig(
            type: HKQuantityType(.heartRateVariabilitySDNN),
            unit: HKUnit.secondUnit(with: .milli),
            scale: 1.0
        ),
        "resting_heart_rate": QuantityTypeConfig(
            type: HKQuantityType(.restingHeartRate),
            unit: HKUnit.count().unitDivided(by: .minute()),
            scale: 1.0
        ),
        "respiratory_rate": QuantityTypeConfig(
            type: HKQuantityType(.respiratoryRate),
            unit: HKUnit.count().unitDivided(by: .minute()),
            scale: 1.0
        ),
        "walking_speed": QuantityTypeConfig(
            type: HKQuantityType(.walkingSpeed),
            unit: HKUnit.meter().unitDivided(by: HKUnit.second()),
            scale: 1.0
        ),
        "vo2_max": QuantityTypeConfig(
            type: HKQuantityType(.vo2Max),
            unit: HKUnit(from: "ml/(kg*min)"),
            scale: 1.0
        ),
        "apple_walking_steadiness": QuantityTypeConfig(
            type: HKQuantityType(.appleWalkingSteadiness),
            unit: HKUnit.percent(),
            scale: 100.0
        ),
    ]

    // Series 8+/Ultra only -- guarded separately since the type itself can
    // throw on unsupported hardware/OS versions, unlike the types above.
    private var wristTemperatureConfig: QuantityTypeConfig? {
        guard #available(iOS 16.0, *) else { return nil }
        return QuantityTypeConfig(
            type: HKQuantityType(.appleSleepingWristTemperature),
            unit: HKUnit.degreeCelsius(),
            scale: 1.0
        )
    }

    private var allStreamingConfigs: [String: QuantityTypeConfig] {
        var configs = streamingConfigs
        if let wristTemp = wristTemperatureConfig {
            configs["apple_sleeping_wrist_temperature"] = wristTemp
        }
        return configs
    }

    // Anchors persist which samples have already been emitted, so a
    // relaunch resumes from the last-seen sample instead of re-emitting
    // history. UserDefaults is the same underlying storage Capacitor's own
    // Preferences plugin uses on iOS -- this just talks to it directly
    // rather than round-tripping the JS bridge for an internal detail.
    let defaults = UserDefaults.standard
    private func anchorKey(for type: HKObjectType) -> String {
        "healthkit_anchor_\(type.identifier)"
    }

    func loadAnchor(for type: HKObjectType) -> HKQueryAnchor? {
        guard let data = defaults.data(forKey: anchorKey(for: type)) else { return nil }
        return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
    }

    func saveAnchor(_ anchor: HKQueryAnchor?, for type: HKObjectType) {
        guard let anchor = anchor,
              let data = try? NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
        else { return }
        defaults.set(data, forKey: anchorKey(for: type))
    }

    var healthStore: HKHealthStore { store }

    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, nil)
            return
        }
        var readTypes: Set<HKObjectType> = Set(allStreamingConfigs.values.map { $0.type })
        readTypes.formUnion(expansionReadTypes())
        store.requestAuthorization(toShare: [], read: readTypes) { granted, error in
            completion(granted, error)
        }
    }

    // Calls back on every new batch of samples for any observed type,
    // forever, until the process ends -- background delivery wakes the app
    // for this.
    func startObserving(onBatch: @escaping ([HealthKitReading]) -> Void) {
        for (readingType, config) in allStreamingConfigs {
            observeStreaming(config: config, readingType: readingType, onBatch: onBatch)
        }
        startExpansionObserving(onBatch: onBatch)
    }

    private func observeStreaming(config: QuantityTypeConfig, readingType: String, onBatch: @escaping ([HealthKitReading]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: config.type, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewStreamingSamples(config: config, readingType: readingType, onBatch: onBatch)
            completionHandler()
        }
        store.execute(observerQuery)
        store.enableBackgroundDelivery(for: config.type, frequency: .immediate) { _, _ in }
    }

    private func fetchNewStreamingSamples(
        config: QuantityTypeConfig,
        readingType: String,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        let anchor = loadAnchor(for: config.type)
        let query = HKAnchoredObjectQuery(
            type: config.type,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let quantitySamples = samples as? [HKQuantitySample], !quantitySamples.isEmpty else { return }

            let readings = quantitySamples.map {
                HealthKitReading(
                    readingType: readingType,
                    value: $0.quantity.doubleValue(for: config.unit) * config.scale,
                    recordedAt: $0.startDate
                )
            }
            self.saveAnchor(newAnchor, for: config.type)
            onBatch(readings)
        }
        store.execute(query)
    }
}
