import importlib.util
import pathlib
import unittest
spec = importlib.util.spec_from_file_location('backend_app', pathlib.Path(__file__).resolve().parents[1] / 'backend/app.py')
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)

class RouteTests(unittest.TestCase):
    def setUp(self):
        backend.app.config['TESTING'] = True
        self.client = backend.app.test_client()

    def test_valid_summary(self):
        r = self.client.post('/route', json={'waypoints': [[18.435,77.425],[18.48,77.42]]})
        self.assertEqual(r.status_code, 200)
        self.assertGreater(r.json['km'], 2)
        self.assertTrue(r.json['one_way'])
        self.assertIsNone(r.json['esp32_cmds'])

    def test_invalid_inputs(self):
        for data in [None, {}, [], {'waypoints': []}, {'waypoints': [[0,0]]},
                     {'waypoints': [[0,0],[0,0]]}, {'waypoints': [['bad',0],[0,0]]},
                     {'waypoints': [[91,0],[0,0]]}, {'waypoints': [[0,181],[0,0]]},
                     {'waypoints': [[True,0],[0,0]]}, {'waypoints': [[float('nan'),0],[0,0]]},
                     {'waypoints': [[0],[0,0]]}]:
            with self.subTest(data=data):
                r = self.client.post('/route', json=data)
                self.assertEqual(r.status_code, 400)
                self.assertIn('error', r.json)

    def test_malformed_json(self):
        self.assertEqual(self.client.post('/route',data='{',content_type='application/json').status_code,400)

if __name__ == '__main__':
    unittest.main()
