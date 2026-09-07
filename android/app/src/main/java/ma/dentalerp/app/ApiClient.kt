package ma.dentalerp.app

import com.google.gson.annotations.SerializedName
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST


data class MobileLoginRequest(val email: String, val password: String)
data class MobileUser(
    val id: String,
    val email: String,
    val name: String?,
    val role: String,
    val hospitalId: String,
    val hospitalName: String?,
    val staffId: String?
)
data class MobileLoginResponse(val token: String, val user: MobileUser)

data class PatientSummary(
    val id: String,
    val patientId: String?,
    val firstName: String,
    val lastName: String,
    val phone: String?
)
data class DoctorSummary(val id: String, val firstName: String, val lastName: String)
data class TodayAppointment(
    val id: String,
    val scheduledTime: String,
    val status: String,
    val appointmentType: String?,
    val patient: PatientSummary,
    val doctor: DoctorSummary
)

data class TodayQueue(
    val waiting: List<TodayAppointment> = emptyList(),
    val inProgress: List<TodayAppointment> = emptyList(),
    val upcoming: List<TodayAppointment> = emptyList(),
    val completed: List<TodayAppointment> = emptyList()
)
data class TodayAppointmentsResponse(val queue: TodayQueue)

interface DentalApi {
    @POST("api/auth/mobile-token")
    suspend fun login(@Body request: MobileLoginRequest): MobileLoginResponse

    @GET("api/appointments/today")
    suspend fun todayAppointments(): TodayAppointmentsResponse
}

class TokenStore {
    @Volatile var token: String? = null
}

object ApiClient {
    val tokenStore = TokenStore()

    private val authInterceptor = Interceptor { chain ->
        val builder = chain.request().newBuilder()
        tokenStore.token?.let { builder.header("Authorization", "Bearer $it") }
        chain.proceed(builder.build())
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .build()

    val api: DentalApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(DentalApi::class.java)
}
