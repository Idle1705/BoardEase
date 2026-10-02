import tempfile
import unittest
from pathlib import Path
from pypdf import PdfReader
from boarding_house import BoardingHouse
from owner import Owner
from tenant import Tenant
from single_room import SingleRoom
from utility_reading import UtilityReading
import reports


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.house = BoardingHouse(Owner('Owner', ''), self.directory / 'ledger.xlsx')
        room = SingleRoom('102', 4000)
        self.house.add_room(room)
        self.tenant = Tenant('Maria Santos', '09123456789')
        self.house.add_tenant(self.tenant, room)
        self.bill = self.house.generate_bills_for_room(
            UtilityReading(room, '2026-10', 50, 10, 10, 30), '2099-10-31')[0]

    def generate(self, **kwargs):
        self.assertTrue(hasattr(reports, 'generate_tenant_pdf'), 'Reports must generate a monthly PDF, not Excel')
        return reports.generate_tenant_pdf(self.house, self.tenant, '2026-10', **kwargs)

    def test_monthly_a4_pdf_and_no_ledger_or_domain_mutation(self):
        self.house.record_payment(self.bill, 1000, '2026-10-02')
        before = self.house.ledger.filepath.read_bytes()
        values = vars(self.bill).copy()
        output = self.generate()
        self.assertEqual(output.name, 'Maria_Santos_Room102_2026-10_Billing.pdf')
        self.assertEqual(output.parent, self.directory / 'reports')
        pdf = PdfReader(output)
        self.assertEqual(len(pdf.pages), 1)
        self.assertAlmostEqual(float(pdf.pages[0].mediabox.width), 595.28, places=1)
        self.assertAlmostEqual(float(pdf.pages[0].mediabox.height), 841.89, places=1)
        content = pdf.pages[0].extract_text()
        for text in ('BoardEase', 'BILLING NOTICE', 'Maria Santos', 'October 2026', 'Monthly Rent',
                     'Electricity', 'Water', '₱4,800.00', '₱3,800.00', 'PARTIAL',
                     'Please settle your balance on or before the due date.',
                     'Prepared by: Boarding House Management', 'Tenant Signature:', 'Date Received:'):
            self.assertIn(text, content)
        self.assertEqual(self.house.ledger.filepath.read_bytes(), before)
        self.assertEqual(vars(self.bill), values)
        self.assertEqual(list(output.parent.glob('*.xlsx')), [])

    def test_previous_balance_does_not_include_future_or_other_tenants(self):
        room = self.tenant.assigned_room
        old = self.house.generate_bills_for_room(UtilityReading(room, '2026-09', 0, 0, 0, 0), '2026-09-30')[0]
        self.house.record_payment(old, 3000, '2026-10-02')
        self.house.generate_bills_for_room(UtilityReading(room, '2026-11', 0, 0, 0, 0), '2099-11-30')
        other_room = SingleRoom('103', 9000)
        self.house.add_room(other_room)
        self.house.add_tenant(Tenant('Other Tenant', '123'), other_room)
        self.house.generate_bills_for_room(UtilityReading(other_room, '2026-09', 0, 0, 0, 0), '2026-09-30')
        content = PdfReader(self.generate()).pages[0].extract_text()
        self.assertIn('Previous Balance', content)
        self.assertIn('₱5,800.00', content)
        self.assertIn('OVERDUE', content)
        self.assertNotIn('November', content)
        self.assertNotIn('Other Tenant', content)

    def test_legacy_combined_utilities_print_without_manual_input(self):
        self.bill.electricity_share = self.bill.water_share = None
        before = self.house.ledger.filepath.read_bytes()
        content = PdfReader(self.generate()).pages[0].extract_text()
        self.assertIn('Utilities', content)
        self.assertNotIn('Electricity', content)
        self.assertIn('₱800.00', content)
        self.assertEqual(self.house.ledger.filepath.read_bytes(), before)

    def test_bulk_one_page_per_billed_tenant_only(self):
        room = SingleRoom('103', 2000)
        self.house.add_room(room)
        tenant = Tenant('Another Tenant', '123')
        self.house.add_tenant(tenant, room)
        self.house.generate_bills_for_room(UtilityReading(room, '2026-10', 0, 0, 0, 0), '2099-10-31')
        empty = SingleRoom('104', 1)
        self.house.add_room(empty)
        self.house.add_tenant(Tenant('No Bill Yet', '123'), empty)
        before = self.house.ledger.filepath.read_bytes()
        self.assertTrue(hasattr(reports, 'generate_monthly_bills_pdf'))
        output = reports.generate_monthly_bills_pdf(self.house, '2026-10')
        self.assertEqual(output.name, 'October_2026_Tenant_Bills.pdf')
        pdf = PdfReader(output)
        self.assertEqual(len(pdf.pages), 2)
        self.assertIn('Maria Santos', pdf.pages[0].extract_text())
        self.assertIn('Another Tenant', pdf.pages[1].extract_text())
        for page in pdf.pages:
            self.assertAlmostEqual(float(page.mediabox.height), 841.89, places=1)
            self.assertNotIn('No Bill Yet', page.extract_text())
        self.assertEqual(self.house.ledger.filepath.read_bytes(), before)

    def test_selection_validation_and_long_names(self):
        self.tenant.name = 'Maria <Santos> & ' + 'Long Name ' * 20
        output = self.generate()
        pdf = PdfReader(output)
        self.assertEqual(len(pdf.pages), 1)
        self.assertIn('Maria <Santos> &', pdf.pages[0].extract_text())
        with self.assertRaises(ValueError):
            reports.generate_tenant_pdf(self.house, self.tenant, '2026-12')
        with self.assertRaises(ValueError):
            reports.generate_tenant_pdf(self.house, Tenant('Unknown', ''), '2026-10')

    def test_regeneration_preserves_prior_pdf(self):
        output = self.generate()
        before = output.read_bytes()
        second = self.generate()
        self.assertNotEqual(output, second)
        self.assertEqual(output.read_bytes(), before)
        self.assertTrue(second.exists())

    def test_legacy_period_and_ambiguous_month(self):
        self.bill.month = '2026-10-10'
        content = PdfReader(self.generate()).pages[0].extract_text()
        self.assertIn('October 2026', content)
        self.house.bills.append(self.bill)
        with self.assertRaisesRegex(ValueError, 'Multiple bills'):
            self.generate()


if __name__ == '__main__':
    unittest.main()
