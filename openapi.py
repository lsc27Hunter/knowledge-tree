# https://fastapi.tiangolo.com/advanced/generate-clients/#preprocess-the-openapi-specification-for-the-client-generator

import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent / "api" / "src"))

from api.src.main import app

out_dir = Path(__file__).parent / "client"
out_dir.mkdir(parents=True, exist_ok=True)
out = out_dir / "openapi.json"

openapi_content = app.openapi()

for path_data in openapi_content["paths"].values():
  for operation in path_data.values():
    try:
      tags = operation["tags"]
      tag = tags[0]
    except (KeyError, IndexError):
      continue
    operation_id = operation["operationId"]
    to_remove = f"{tag}-"
    new_operation_id = operation_id[len(to_remove) :]
    operation["operationId"] = new_operation_id

out.write_text(json.dumps(openapi_content, indent=2))
