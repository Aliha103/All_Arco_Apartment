import logging
import os
import textwrap
import xml.etree.ElementTree as ET
from typing import Optional, Dict, Any

import requests
from django.conf import settings

from .models import AlloggiatiAccount

logger = logging.getLogger(__name__)


WSDL_URL = "https://alloggiatiweb.poliziadistato.it/service/service.asmx?wsdl"
SOAP_URL = "https://alloggiatiweb.poliziadistato.it/service/service.asmx"


class AlloggiatiClient:
    """
    SOAP client for Alloggiati Web Services.

    Authentication Method:
    - WSKEY (Web Service Key) is required for all API calls
    - WSKEY must be generated from Alloggiati Web portal
    - Found under: Account Menu → "Chiave Web Service"
    - Can only generate new WSKEY once per day
    - Must regenerate WSKEY when password changes

    Reference: Manuale Web-Services from
    https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/SupManuali.aspx
    """

    def __init__(self, account: Optional[AlloggiatiAccount] = None):
        self.account = account or AlloggiatiAccount.objects.first()

    @property
    def username(self) -> Optional[str]:
        """Get username from account or environment variable."""
        return self.account.username if self.account else os.getenv('ALLOGGIATI_USERNAME')

    @property
    def password(self) -> Optional[str]:
        """Get password from account or environment variable."""
        if self.account and self.account.password:
            # TODO: Decrypt password if you implement encryption
            return self.account.password
        return os.getenv('ALLOGGIATI_PASSWORD')

    @property
    def wskey(self) -> Optional[str]:
        """Get WSKEY from account or environment variable."""
        return self.account.wskey if self.account else os.getenv('ALLOGGIATI_WSKEY')

    def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to Alloggiati Web Services.

        This method tests the WSKEY authentication by making a simple API call.

        Returns:
            dict with keys: success (bool), message (str), error (optional str)
        """
        if not self.wskey:
            msg = "Missing WSKEY. Generate it from Alloggiati Web portal (Account → Chiave Web Service)"
            logger.warning(msg)
            if self.account:
                self.account.set_error(msg)
            return {"success": False, "error": msg}

        if not self.username:
            msg = "Missing username. Please provide your Alloggiati Web username."
            logger.warning(msg)
            if self.account:
                self.account.set_error(msg)
            return {"success": False, "error": msg}

        # Test WSKEY by calling a simple service method
        # According to the manual, we can use TestWSKEY or similar method
        envelope = textwrap.dedent(
            f"""
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                           xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                           xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <TestWSKEY xmlns="https://alloggiatiweb.poliziadistato.it/">
                  <Username>{self.username}</Username>
                  <WSKey>{self.wskey}</WSKey>
                </TestWSKEY>
              </soap:Body>
            </soap:Envelope>
            """
        ).strip()

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "https://alloggiatiweb.poliziadistato.it/TestWSKEY",
        }

        try:
            resp = requests.post(SOAP_URL, data=envelope.encode('utf-8'), headers=headers, timeout=30)
            resp.raise_for_status()

            # Parse response to check if test was successful
            success = self._parse_test_result(resp.text)

            if success:
                if self.account:
                    self.account.mark_connected()
                return {
                    "success": True,
                    "message": "Connection successful! WSKEY is valid.",
                    "raw_response": resp.text
                }
            else:
                msg = "WSKEY test failed. Please check your credentials and regenerate WSKEY if needed."
                if self.account:
                    self.account.set_error(msg)
                return {"success": False, "error": msg, "raw_response": resp.text}

        except requests.exceptions.Timeout:
            msg = "Connection timeout. Please check your internet connection and try again."
            logger.exception(msg)
            if self.account:
                self.account.set_error(msg)
            return {"success": False, "error": msg}

        except requests.exceptions.RequestException as exc:
            msg = f"Connection failed: {str(exc)}"
            logger.exception(msg)
            if self.account:
                self.account.set_error(msg)
            return {"success": False, "error": msg}

        except Exception as exc:
            msg = f"Unexpected error: {str(exc)}"
            logger.exception(msg)
            if self.account:
                self.account.set_error(msg)
            return {"success": False, "error": msg}

    def submit_guests(self, booking) -> Dict[str, Any]:
        """
        Submit booking guest data to Alloggiati Web Services.

        Args:
            booking: Booking instance with related guests

        Returns:
            dict with success status, message, and any error details
        """
        if not self.wskey:
            return {
                'success': False,
                'error': 'Missing WSKEY. Generate it from Alloggiati Web portal.'
            }

        if not self.username:
            return {
                'success': False,
                'error': 'Missing username. Please configure your Alloggiati credentials.'
            }

        guests = booking.guests.all()
        if not guests.exists():
            return {'success': False, 'error': 'No guests to submit'}

        try:
            # Build SOAP envelope with guest data according to Alloggiati Web Services manual
            # This is a simplified placeholder - you'll need to implement the exact XML schema
            # from the "Manuale Web-Services" document

            logger.info(f"Submitting {guests.count()} guests for booking {booking.booking_id}")
            logger.info(f"Check-in: {booking.check_in_date}, Check-out: {booking.check_out_date}")

            # TODO: Implement actual SOAP submission following the Alloggiati Web Services manual
            # The envelope should include:
            # - Username
            # - WSKEY
            # - Facility information
            # - Guest details (names, documents, dates, etc.)

            # For now, mark as not implemented
            return {
                'success': False,
                'error': 'Guest submission not yet implemented. Please implement according to Manuale Web-Services.',
                'note': 'WSKEY authentication is configured and working. Guest submission SOAP envelope needs to be implemented.'
            }

        except Exception as exc:
            msg = f"Submission to Alloggiati failed: {exc}"
            logger.exception(msg)
            return {'success': False, 'error': msg}

    @staticmethod
    def _parse_test_result(xml_text: str) -> bool:
        """
        Parse SOAP XML response from TestWSKEY call.

        Returns:
            True if test was successful, False otherwise
        """
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return False

        # Look for TestWSKEYResult element
        for elem in root.iter():
            if elem.tag.lower().endswith('testwskeyresult'):
                # If the result is "OK" or "true", consider it successful
                if elem.text and elem.text.lower() in ('ok', 'true', '1', 'success'):
                    return True
        return False


def submit_to_alloggiati(booking) -> Dict[str, Any]:
    """
    Submit booking guest data to the Italian police Alloggiati system.

    Args:
        booking: Booking instance with related guests

    Returns:
        dict with success status and any error messages
    """
    client = AlloggiatiClient()
    return client.submit_guests(booking)
