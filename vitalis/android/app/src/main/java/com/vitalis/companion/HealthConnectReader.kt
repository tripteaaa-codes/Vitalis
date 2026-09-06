package com.vitalis.companion

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit

data class HealthData(
    val heartRate: Double?,
    val spo2: Double?,
    val steps: Long?
)

class HealthConnectReader(
    context: Context
) {

    private val client =
        HealthConnectClient.getOrCreate(context)

    suspend fun readLatestHealthData(): HealthData {

        val endTime = Instant.now()
        val startTime = endTime.minus(24, ChronoUnit.HOURS)

        val timeRange =
            TimeRangeFilter.between(
                startTime,
                endTime
            )

        val heartRate =
            readHeartRate(timeRange)

        val spo2 =
            readSpO2(timeRange)

        val steps =
            readSteps(timeRange)

        Log.d(
            "VITALIS_DATA",
            "Heart Rate: $heartRate BPM"
        )

        Log.d(
            "VITALIS_DATA",
            "SpO2: $spo2 %"
        )

        Log.d(
            "VITALIS_DATA",
            "Steps: $steps"
        )

        return HealthData(
            heartRate = heartRate,
            spo2 = spo2,
            steps = steps
        )
    }

    private suspend fun readHeartRate(
        timeRange: TimeRangeFilter
    ): Double? {

        val response =
            client.readRecords(
                ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = timeRange
                )
            )

        val latestRecord =
            response.records
                .maxByOrNull {
                    it.startTime
                }

        val latestSample =
            latestRecord
                ?.samples
                ?.maxByOrNull {
                    it.time
                }

        return latestSample?.beatsPerMinute?.toDouble()
    }

    private suspend fun readSpO2(
        timeRange: TimeRangeFilter
    ): Double? {

        val response =
            client.readRecords(
                ReadRecordsRequest(
                    recordType = OxygenSaturationRecord::class,
                    timeRangeFilter = timeRange
                )
            )

        val latestRecord =
            response.records
                .maxByOrNull {
                    it.time
                }

        return latestRecord
            ?.percentage
            ?.value
    }

    private suspend fun readSteps(
        timeRange: TimeRangeFilter
    ): Long? {

        val response =
            client.readRecords(
                ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = timeRange
                )
            )

        return response.records
            .sumOf {
                it.count
            }
    }
}