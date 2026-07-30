from logging import Formatter, StreamHandler
import logging

log = logging.getLogger(name="knowledgetree")

def _init_log():
  formatter = Formatter('%(asctime)s %(levelname)s %(message)s')
  console_handler = StreamHandler()
  console_handler.setFormatter(formatter)
  log.setLevel(logging.DEBUG)
  log.addHandler(console_handler)

_init_log()