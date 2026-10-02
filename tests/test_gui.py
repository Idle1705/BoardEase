import tempfile
import tkinter as tk
import unittest
from pathlib import Path
from unittest.mock import patch
from pypdf import PdfReader
from gui_app import BoardEaseApp
from ui_components import RoundedButton
from tkinter import ttk
from single_room import SingleRoom
from tenant import Tenant
from utility_reading import UtilityReading


class GuiWorkflowTests(unittest.TestCase):
    def test_month_selector_automatic_breakdown_and_stale_pdf_buttons(self):
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            try:
                app = BoardEaseApp(root, ledger_filepath=Path(directory) / 'ledger.xlsx')
                room = SingleRoom('102', 100)
                app.house.add_room(room)
                app.house.add_tenant(Tenant('Maria Santos', '123'), room)
                for month in ('2026-10', '2026-11'):
                    app.house.generate_bills_for_room(UtilityReading(room, month, 3, 2, 10, 10), '2099-11-30')
                app.show_page('Reports')
                root.update()
                self.assertEqual(app.report_month.get(), 'November 2026')
                app.report_month_combo.current(1)
                app.report_month_combo.event_generate('<<ComboboxSelected>>')
                root.update()
                self.assertEqual(app.report_month.get(), 'October 2026')
                self.assertFalse(hasattr(app, 'report_electricity'))
                self.assertFalse(hasattr(app, 'report_water'))
                app.generate_report()
                self.assertIsNotNone(app.generated_pdf, app.report_result.get())
                content = PdfReader(app.generated_pdf).pages[0].extract_text()
                self.assertIn('October 2026', content)
                self.assertNotIn('November 2026', content)
                app.report_month_combo.current(0)
                app.report_month_combo.event_generate('<<ComboboxSelected>>')
                root.update()
                self.assertIsNone(app.generated_pdf)
                self.assertIn('disabled', app.print_pdf_button.state())
                app.generate_bulk_report()
                self.assertEqual(len(PdfReader(app.generated_pdf).pages), 1)
            finally:
                root.destroy()

    def walk(self, widget):
        for child in widget.winfo_children():
            yield child
            yield from self.walk(child)

    def test_rounded_button_keyboard_and_disabled_behavior(self):
        root = tk.Tk()
        try:
            calls = []
            button = RoundedButton(root, text='Test Action', command=lambda: calls.append(True))
            button.pack()
            root.update()
            button.focus_force()
            root.update()
            button.event_generate('<Return>')
            root.update()
            self.assertEqual(len(calls), 1)
            button.state(['disabled'])
            button.invoke()
            self.assertEqual(len(calls), 1)
            button.state(['!disabled'])
            button.invoke()
            self.assertEqual(len(calls), 2)
        finally:
            root.destroy()

    def test_complete_desktop_workflow_and_empty_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            self.addCleanup(root.destroy)
            self.assertIn('ledger_filepath', __import__('inspect').signature(BoardEaseApp).parameters,
                          'GUI needs an explicit ledger path for safe testing and launch')
            app = BoardEaseApp(root, ledger_filepath=Path(directory) / 'ledger.xlsx')
            errors = []
            root.report_callback_exception = lambda *args: errors.append(args)
            for page in app.PAGES:
                app.show_page(page)
                root.update()
            form = app.add_room_dialog()
            form.fields['number'].set('Test 101')
            form.fields['rent'].set('invalid')
            form.submit()
            self.assertTrue(form.error.get())
            self.assertEqual(len(app.house.rooms), 0)
            form.fields['rent'].set('3500')
            form.submit()
            form = app.add_tenant_dialog()
            form.fields['name'].set('Long Tenant ' + 'Name ' * 12)
            form.fields['contact'].set('09171234567')
            form.submit()
            form = app.generate_bills_dialog()
            form.fields['month'].set('2026-10')
            form.fields['due'].set('2099-10-31')
            form.submit()
            bill = app.house.bills[0]
            self.assertEqual(bill.get_status(), 'UNPAID')
            app.show_page('Payments')
            app.payment_amount.set('99999')
            app.record_payment()
            self.assertTrue(app.payment_error.get())
            self.assertEqual(bill.balance, 3500)
            app.payment_amount.set('1000')
            app.record_payment()
            self.assertEqual(bill.get_status(), 'PARTIAL')
            self.assertEqual(bill.balance, 2500)
            app.payment_amount.set('2500')
            app.record_payment()
            self.assertEqual(bill.get_status(), 'PAID')
            self.assertFalse(app.unpaid_bills)
            self.assertEqual(app.house.summary()['paid'], 1)
            self.assertEqual(app.house.summary()['balance'], 0)
            app.show_page('Dashboard')
            root.update()
            app.show_page('Billing')
            app.billing_filter.set('Paid')
            app.refresh_billing_table()
            self.assertEqual(len(app.billing_table.get_children()), 1)
            app.billing_filter.set('Unpaid')
            app.refresh_billing_table()
            self.assertEqual(len(app.billing_table.get_children()), 0)
            app.billing_filter.set('All')
            app.billing_search.set('not found')
            app.refresh_billing_table()
            self.assertEqual(len(app.billing_table.get_children()), 0)
            app.billing_search.set('long tenant')
            app.refresh_billing_table()
            self.assertEqual(len(app.billing_table.get_children()), 1)
            app.show_page('Reports')
            self.assertIn('disabled', app.open_pdf_button.state())
            self.assertIn('disabled', app.print_pdf_button.state())
            before = app.house.ledger.filepath.read_bytes()
            app.generate_report()
            self.assertIsNotNone(app.generated_pdf, app.report_result.get())
            self.assertIn('PAID', PdfReader(app.generated_pdf).pages[0].extract_text())
            self.assertIn('Saved to:', app.report_result.get())
            self.assertNotIn('disabled', app.open_pdf_button.state())
            self.assertNotIn('disabled', app.print_pdf_button.state())
            with patch('reports.os.startfile') as dispatch:
                app.open_report()
                dispatch.assert_called_once_with(str(app.generated_pdf.resolve()), 'open')
            with patch('reports.os.startfile') as dispatch:
                app.print_report()
                dispatch.assert_called_once_with(str(app.generated_pdf.resolve()), 'print')
            with patch('reports.os.startfile', side_effect=OSError('no print association')):
                app.print_report()
                self.assertIn('Ctrl+P', app.report_result.get())
            app._refresh_report()
            self.assertIsNone(app.generated_pdf)
            self.assertIn('disabled', app.print_pdf_button.state())
            self.assertEqual(app.house.ledger.filepath.read_bytes(), before)
            for size in ('1280x720', '1366x768', '1440x900', '1920x1080'):
                root.geometry(size)
                for page in app.PAGES:
                    app.show_page(page)
                    root.update()
                    for widget in self.walk(app.content):
                        if isinstance(widget, ttk.Treeview):
                            self.assertGreaterEqual(widget.xview()[1], 0.999)
                        if isinstance(widget, ttk.Scrollbar):
                            self.assertNotEqual(str(widget.cget('orient')), 'horizontal')
                        if isinstance(widget, (tk.Label, ttk.Label, RoundedButton)):
                            self.assertNotIn('Send Reminders', str(widget.cget('text')))
                            self.assertNotIn('BoardEase\n      Owner', str(widget.cget('text')))
            self.assertEqual(errors, [])
            root.destroy()
            self._cleanups.clear()
            root = tk.Tk()
            self.addCleanup(root.destroy)
            app = BoardEaseApp(root, ledger_filepath=Path(directory) / 'ledger.xlsx')
            self.assertEqual(app.house.bills[0].get_status(), 'PAID')
            self.assertEqual(len(app.house.payments), 2)


if __name__ == '__main__':
    unittest.main()
