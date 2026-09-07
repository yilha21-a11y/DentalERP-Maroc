package ma.dentalerp.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    DentalERPTabletApp()
                }
            }
        }
    }
}

@Composable
fun DentalERPTabletApp() {
    var user by remember { mutableStateOf<MobileUser?>(null) }
    if (user == null) {
        LoginScreen(onLoggedIn = { user = it })
    } else {
        TodayScreen(user = user!!, onLogout = {
            ApiClient.tokenStore.token = null
            user = null
        })
    }
}

@Composable
fun LoginScreen(onLoggedIn: (MobileUser) -> Unit) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(modifier = Modifier.widthIn(max = 520.dp).padding(24.dp)) {
            Column(modifier = Modifier.padding(28.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("DentalERP Maroc", style = MaterialTheme.typography.headlineMedium)
                Text("Connexion au cabinet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("E-mail") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Mot de passe") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), singleLine = true)
                if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            error = ""
                            try {
                                val result = ApiClient.api.login(MobileLoginRequest(email.trim(), password))
                                ApiClient.tokenStore.token = result.token
                                onLoggedIn(result.user)
                            } catch (_: Exception) {
                                error = "Connexion impossible. Vérifiez vos identifiants et le serveur."
                            } finally {
                                loading = false
                            }
                        }
                    },
                    enabled = !loading && email.isNotBlank() && password.length >= 6,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Se connecter")
                }
            }
        }
    }
}

@Composable
fun TodayScreen(user: MobileUser, onLogout: () -> Unit) {
    val scope = rememberCoroutineScope()
    var appointments by remember { mutableStateOf<List<TodayAppointment>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }

    fun reload() {
        scope.launch {
            loading = true
            error = ""
            try {
                val response = ApiClient.api.todayAppointments()
                appointments = response.queue.waiting + response.queue.inProgress + response.queue.upcoming + response.queue.completed
            } catch (_: Exception) {
                error = "Impossible de charger l’agenda."
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("Agenda du jour", style = MaterialTheme.typography.headlineMedium)
                Text("${user.name ?: user.email} • ${user.hospitalName ?: "Cabinet"}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { reload() }) { Text("Actualiser") }
                OutlinedButton(onClick = onLogout) { Text("Déconnexion") }
            }
        }
        Spacer(Modifier.height(20.dp))

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error.isNotBlank() -> Text(error, color = MaterialTheme.colorScheme.error)
            appointments.isEmpty() -> Text("Aucun rendez-vous aujourd’hui.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(appointments, key = { it.id }) { appt ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth().padding(18.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("${appt.patient.firstName} ${appt.patient.lastName}", style = MaterialTheme.typography.titleMedium)
                                Text("${appt.scheduledTime} • ${appt.appointmentType ?: "Consultation"}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            AssistChip(onClick = {}, label = { Text(statusLabel(appt.status)) })
                        }
                    }
                }
            }
        }
    }
}

private fun statusLabel(status: String): String = when (status) {
    "SCHEDULED" -> "Planifié"
    "CONFIRMED" -> "Confirmé"
    "CHECKED_IN" -> "Arrivé"
    "IN_PROGRESS" -> "En consultation"
    "COMPLETED" -> "Terminé"
    "NO_SHOW" -> "Absent"
    "CANCELLED" -> "Annulé"
    else -> status
}
