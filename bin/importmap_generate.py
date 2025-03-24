#!/usr/bin/env python
import os
import json


def generate_import_map(base_dirs):
    import_map = {"imports": {}}
    for base_dir in base_dirs:
        # import_dir is base_dir without 'ollama_serv'
        import_dir = "/" + base_dir.split("ollama_serv/")[-1]

        js_files = [f for f in os.listdir(base_dir) if f.endswith(".js")]
        for js_file in js_files:
            key = f"{import_dir}/{js_file}"
            value = key + "?version={{ version }}"
            import_map["imports"][key] = value
    return json.dumps(import_map, indent=4)


base_directories = ["ollama_serv/static/js", "ollama_serv/static/dist"]
import_map = generate_import_map(base_directories)
import_map_html = f'<script type="importmap">\n{import_map}\n</script>'

with open("ollama_serv/templates/includes/importmap.html", "w") as f:
    f.write(import_map_html)
