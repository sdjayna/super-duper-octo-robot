import unittest
from server.server import sanitize_for_comment, format_block, build_config_comment, normalize_medium_info


class TestServerMetadata(unittest.TestCase):
    def test_sanitize_truncates_long_strings(self):
        long_string = 'a' * 500
        result = sanitize_for_comment(long_string, max_length=50)
        self.assertTrue(result.startswith('a' * 50))
        self.assertIn('len=500', result)

    def test_format_block_handles_none(self):
        block = format_block('Section:', None)
        self.assertIn('(none)', block)

    def test_normalize_medium_info_from_string(self):
        result = normalize_medium_info('sakura')
        self.assertEqual(result['id'], 'sakura')
        self.assertEqual(result['metadata'], {})
        self.assertEqual(result['disabledColors'], [])

    def test_build_config_comment_with_string_medium(self):
        config = {
            'paper': {'id': 'a4', 'name': 'A4', 'width': 210, 'height': 297, 'margin': 10},
            'medium': 'sakura',
            'hatch': {'style': 'scanline', 'spacing': 2},
            'drawingControls': {'pointCount': 200},
            'drawingData': {'seed': 42}
        }
        comment = build_config_comment('Test Drawing', config)
        self.assertIn('Paper: id=a4', comment)
        self.assertIn('Medium: id=sakura', comment)
        self.assertIn('Hatch Settings:', comment)
        self.assertIn('Drawing Controls:', comment)
        self.assertTrue(comment.strip().startswith('<!--'))
        self.assertTrue(comment.strip().endswith('-->'))


if __name__ == '__main__':
    unittest.main()
