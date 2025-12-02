import logging
import os
import textwrap
import xml.etree.ElementTree as ET
from typing import Optional

import requests
from django.conf import settings

from .models import AlloggiatiAccount

logger = logging.getLogger(__name__)


WSDL_URL = "https://alloggiatiweb.poliziadistato.it/service/service.asmx?wsdl"
SOAP_URL = "https://alloggiatiweb.poliziadistato.it/service/service.asmx"


class AlloggiatiClient:
    """
    Minimal SOAP client for Alloggiati token retrieval.

    Note: The official "Manuale Web-Services" defines the exact SOAP operations.
    Here we implement a GetToken call using the public endpoint and will surface
    any protocol errors cleanly so we can iterate with real credentials.
    """

    def __init__(self, account: Optional[AlloggiatiAccount] = None):
        self.account = account or AlloggiatiAccount.objects.first()

    @property
    def username(self) -> Optional[str]:
        return os.getenv('ALLOGGIATI_USERNAME') or (self.account.username if self.account else None)

    @property
    def password(self) -> Optional[str]:
        # Prefer env var; user will provide later
        return os.getenv('ALLOGGIATI_PASSWORD')

    def fetch_token(self) -> dict:
        """
        Attempt to fetch a session token from Alloggiati.
        Returns dict with keys: success, token (optional), raw_response, error.
        """
        if not self.username or not self.password:
            msg = "Missing Alloggiati credentials (username/password). Set ALLOGGIATI_USERNAME/ALLOGGIATI_PASSWORD."
            logger.warning(msg)
            if self.account:
                self.account.set_error(msg)
            return {"success": False, "error": msg}

        # SOAP envelope based on common GetToken pattern from the manual.
        envelope = textwrap.dedent(
            f"""
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                           xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                           xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <GetToken xmlns="https://alloggiatiweb.poliziadistato.it/">
                  <username>{self.username}</username>
                  <password>{self.password}</password>
                </GetToken>
              </soap:Body>
            </soap:Envelope>
            """
        ).strip()

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "https://alloggiatiweb.poliziadistato.it/GetToken",
        }

        try:
            resp = requests.post(SOAP_URL, data=envelope.encode('utf-8'), headers=headers, timeout=30)
            resp.raise_for_status()
        except Exception as exc:
            msg = f"Token request failed: {exc}"
            logger.exception(msg)
            if self.account:
                self.account.set_error(msg)
            return {"success": False, "error": msg}

        token = self._parse_token(resp.text)
        if token:
            if self.account:
                # Validity duration is not documented in the manual excerpt; leave expires null
                self.account.update_token(token, validity_minutes=None)
            return {"success": True, "token": token, "raw_response": resp.text}

        msg = "Token not found in SOAP response"
        if self.account:
            self.account.set_error(msg)
        return {"success": False, "error": msg, "raw_response": resp.text}

    @staticmethod
    def _parse_token(xml_text: str) -> Optional[str]:
        """
        Parse SOAP XML and extract token text if present.
        Expected element name from manual: GetTokenResult
        """
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return None

        for elem in root.iter():
            if elem.tag.lower().endswith('gettokenresult'):
                return elem.text
        return None
