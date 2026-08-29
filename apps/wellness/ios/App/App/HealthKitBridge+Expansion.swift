import Foundation
import HealthKit

struct HealthKitSleepSample {
    let startedAt: Date
    let endedAt: Date
    let stage: String
}

struct HealthKitEcgSample {
    let recordedAt: Date
    let classification: String
    let averageHeartRate: Double?
}

struct HealthKitRhythmSample {
    let recordedAt: Date
}

extension HealthKitBridge {
    // MARK: - Daily-cumulative (steps, active energy, distance, stand time)

    private var dailyCumulativeTypes: [String: HKQuantityType] {
        [
            "step_count": HKQuantityType(.stepCount),
            "active_energy_burned": HKQuantityType(.activeEnergyBurned),
            "distance_walked_running": HKQuantityType(.distanceWalkingRunning),
            "apple_stand_time": HKQuantityType(.appleStandTime),
        ]
    }

    private var dailyCumulativeUnits: [String: HKUnit] {
        [
            "step_count": .count(),
            "active_energy_burned": .kilocalorie(),
            "distance_walked_running": .meterUnit(with: .kilo),
            "apple_stand_time": .minute(),
        ]
    }

    private var sleepType: HKCategoryType { HKCategoryType(.sleepAnalysis) }
    private var rhythmEventType: HKCategoryType { HKCategoryType(.irregularHeartRhythmEvent) }
    private var ecgType: HKElectrocardiogramType { HKObjectType.electrocardiogramType() }

    // Called from HealthKitBridge.requestAuthorization -- folds every
    // expansion read type into the same single authorization sheet.
    func expansionReadTypes() -> Set<HKObjectType> {
        var types: Set<HKObjectType> = Set(dailyCumulativeTypes.values)
        types.insert(sleepType)
        types.insert(rhythmEventType)
        types.insert(ecgType)
        return types
    }

    // Called from HealthKitBridge.startObserving.
    func startExpansionObserving(onBatch: @escaping ([HealthKitReading]) -> Void) {
        for (readingType, type) in dailyCumulativeTypes {
            observeDailyCumulative(type: type, readingType: readingType, unit: dailyCumulativeUnits[readingType]!, onBatch: onBatch)
        }
    }

    private func observeDailyCumulative(
        type: HKQuantityType,
        readingType: String,
        unit: HKUnit,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        let anchorDate = Calendar.current.startOfDay(for: Date())
        let dailyInterval = DateComponents(day: 1)

        let statsQuery = HKStatisticsCollectionQuery(
            quantityType: type,
            quantitySamplePredicate: nil,
            options: .cumulativeSum,
            anchorDate: anchorDate,
            intervalComponents: dailyInterval
        )
        statsQuery.initialResultsHandler = { [weak self] _, results, _ in
            self?.emitTodayStatistic(results, unit: unit, readingType: readingType, onBatch: onBatch)
        }
        statsQuery.statisticsUpdateHandler = { [weak self] _, _, results, _ in
            self?.emitTodayStatistic(results, unit: unit, readingType: readingType, onBatch: onBatch)
        }
        healthStore.execute(statsQuery)
        healthStore.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func emitTodayStatistic(
        _ results: HKStatisticsCollection?,
        unit: HKUnit,
        readingType: String,
        onBatch: @escaping ([HealthKitReading]) -> Void
    ) {
        guard let results else { return }
        let today = Calendar.current.startOfDay(for: Date())
        guard let stats = results.statistics(for: today), let sum = stats.sumQuantity() else { return }
        onBatch([HealthKitReading(readingType: readingType, value: sum.doubleValue(for: unit), recordedAt: today)])
    }

    // MARK: - Sleep sessions (HKCategoryTypeIdentifier.sleepAnalysis)

    func startObservingSleep(onBatch: @escaping ([HealthKitSleepSample]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: sleepType, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewSleepSamples(onBatch: onBatch)
            completionHandler()
        }
        healthStore.execute(observerQuery)
        healthStore.enableBackgroundDelivery(for: sleepType, frequency: .immediate) { _, _ in }
    }

    private func stageLabel(for value: Int) -> String? {
        switch HKCategoryValueSleepAnalysis(rawValue: value) {
        case .inBed: return "in_bed"
        case .asleepCore: return "asleep_core"
        case .asleepDeep: return "asleep_deep"
        case .asleepREM: return "asleep_rem"
        case .awake: return "awake"
        default: return nil // .asleepUnspecified and any future case -- skip rather than guess
        }
    }

    private func fetchNewSleepSamples(onBatch: @escaping ([HealthKitSleepSample]) -> Void) {
        let anchor = loadAnchor(for: sleepType)
        let query = HKAnchoredObjectQuery(
            type: sleepType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let categorySamples = samples as? [HKCategorySample], !categorySamples.isEmpty else { return }
            let sessions = categorySamples.compactMap { sample -> HealthKitSleepSample? in
                guard let stage = self.stageLabel(for: sample.value) else { return nil }
                return HealthKitSleepSample(startedAt: sample.startDate, endedAt: sample.endDate, stage: stage)
            }
            self.saveAnchor(newAnchor, for: self.sleepType)
            if !sessions.isEmpty { onBatch(sessions) }
        }
        healthStore.execute(query)
    }

    // MARK: - Irregular rhythm notifications

    func startObservingRhythmEvents(onBatch: @escaping ([HealthKitRhythmSample]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: rhythmEventType, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewRhythmEvents(onBatch: onBatch)
            completionHandler()
        }
        healthStore.execute(observerQuery)
        healthStore.enableBackgroundDelivery(for: rhythmEventType, frequency: .immediate) { _, _ in }
    }

    private func fetchNewRhythmEvents(onBatch: @escaping ([HealthKitRhythmSample]) -> Void) {
        let anchor = loadAnchor(for: rhythmEventType)
        let query = HKAnchoredObjectQuery(
            type: rhythmEventType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let categorySamples = samples as? [HKCategorySample], !categorySamples.isEmpty else { return }
            let events = categorySamples.map { HealthKitRhythmSample(recordedAt: $0.startDate) }
            self.saveAnchor(newAnchor, for: self.rhythmEventType)
            onBatch(events)
        }
        healthStore.execute(query)
    }

    // MARK: - ECG (classification + averaged heart rate only, never raw voltage)
    //
    // Third-party apps can never initiate an ECG -- this only observes a
    // sample the member already took via the Watch's own ECG app.

    func startObservingEcg(onBatch: @escaping ([HealthKitEcgSample]) -> Void) {
        let observerQuery = HKObserverQuery(sampleType: ecgType, predicate: nil) { [weak self] _, completionHandler, _ in
            self?.fetchNewEcgSamples(onBatch: onBatch)
            completionHandler()
        }
        healthStore.execute(observerQuery)
        healthStore.enableBackgroundDelivery(for: ecgType, frequency: .immediate) { _, _ in }
    }

    private func classificationLabel(for classification: HKElectrocardiogram.Classification) -> String {
        switch classification {
        case .sinusRhythm: return "sinus_rhythm"
        case .atrialFibrillation: return "atrial_fibrillation"
        case .inconclusiveLowHeartRate: return "inconclusive_low_heart_rate"
        case .inconclusiveHighHeartRate: return "inconclusive_high_heart_rate"
        case .inconclusivePoorReading: return "inconclusive_poor_reading"
        case .inconclusiveOther: return "inconclusive_other"
        case .unrecognized: return "unrecognized"
        case .notSet: return "not_set"
        @unknown default: return "unknown"
        }
    }

    private func fetchNewEcgSamples(onBatch: @escaping ([HealthKitEcgSample]) -> Void) {
        let anchor = loadAnchor(for: ecgType)
        let query = HKAnchoredObjectQuery(
            type: ecgType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, _ in
            guard let self, let ecgSamples = samples as? [HKElectrocardiogram], !ecgSamples.isEmpty else { return }
            let readings = ecgSamples.map { sample in
                HealthKitEcgSample(
                    recordedAt: sample.startDate,
                    classification: self.classificationLabel(for: sample.classification),
                    averageHeartRate: sample.averageHeartRate?.doubleValue(for: .count().unitDivided(by: .minute()))
                )
            }
            self.saveAnchor(newAnchor, for: self.ecgType)
            onBatch(readings)
        }
        healthStore.execute(query)
    }

    // MARK: - Fall risk / fall detection
    //
    // Walking Steadiness (Group A streaming type, see HealthKitBridge.swift)
    // is the fall-*risk* signal that ships in this pass -- it needs no
    // special entitlement. Real fall-*event* capture needs Apple's
    // CMFallDetectionManager (Core Motion) entitlement, which is a
    // request-and-wait process with Apple -- not obtainable in this
    // session, and its exact API surface (instance vs. type methods,
    // delegate protocol shape) needs verifying against the real SDK in
    // Xcode, not guessed here. Deliberately hardcoded false: this is the
    // one honest no-op stub in this plan, not a shortcut on a task this
    // plan could otherwise finish -- CMFallDetectionManager wiring is a
    // separate, future task gated on Apple's approval, at which point
    // implement it against the actual SDK with autocomplete/docs in hand.
    func fallDetectionAvailable() -> Bool {
        return false
    }
}
