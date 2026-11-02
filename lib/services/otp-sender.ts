/**
 * Interface d'envoi des codes OTP du portail patient (WhatsApp / SMS).
 *
 * AUCUN fournisseur n'est branché : l'implémentation par défaut est désactivée
 * et échoue proprement. Pour activer l'envoi, implémenter `OtpSender` et la
 * retourner depuis `getOtpSender()` selon la configuration.
 */
export interface OtpMessage {
  /** Numéro au format E.164 (+212…) */
  to: string
  /** Code en clair : à ne JAMAIS journaliser ni renvoyer en HTTP */
  code: string
  hospitalId: string
  ttlMinutes: number
}

export interface OtpSender {
  readonly name: string
  isConfigured(): boolean
  send(message: OtpMessage): Promise<void>
}

export class OtpDeliveryNotConfiguredError extends Error {
  constructor() {
    super("Aucun fournisseur d'envoi OTP (WhatsApp/SMS) n'est configuré")
    this.name = 'OtpDeliveryNotConfiguredError'
  }
}

class DisabledOtpSender implements OtpSender {
  readonly name = 'disabled'
  isConfigured() {
    return false
  }
  async send(): Promise<void> {
    throw new OtpDeliveryNotConfiguredError()
  }
}

export function getOtpSender(): OtpSender {
  // TODO (décision propriétaire) : retourner l'implémentation WhatsApp ou SMS
  // choisie, par ex. selon process.env.PATIENT_OTP_PROVIDER.
  return new DisabledOtpSender()
}
