import { LEGAL_ENTITY } from "./entity";

export function LegalEntityBlock() {
  return (
    <div className="legal-def-block legal-entity-block">
      <p>
        <strong>Contracting party:</strong> The Services are operated by{" "}
        <strong>{LEGAL_ENTITY.legalName}</strong>, incorporated under the laws of{" "}
        {LEGAL_ENTITY.jurisdiction}, with its principal business address at {LEGAL_ENTITY.address}.
      </p>
      <p>
        <strong>Privacy Officer:</strong> {LEGAL_ENTITY.privacyOfficerTitle} —{" "}
        <a href={`mailto:${LEGAL_ENTITY.privacyEmail}`}>{LEGAL_ENTITY.privacyEmail}</a>
        {" · "}
        Mailing address: {LEGAL_ENTITY.address}
      </p>
      <p>
        <strong>Legal inquiries:</strong>{" "}
        <a href={`mailto:${LEGAL_ENTITY.legalEmail}`}>{LEGAL_ENTITY.legalEmail}</a>
        {" · "}
        <strong>Support:</strong>{" "}
        <a href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a>
      </p>
      <p className="legal-entity-note">
        Update the bracketed entity details above with your registered legal name, jurisdiction, and address
        when confirmed with counsel.
      </p>
    </div>
  );
}
