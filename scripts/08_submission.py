"""Assemble submission.json at the repo root from answers + findings."""
import json

ROOT = "/home/rishisulakhe/ivy_homes"

answers = json.load(open(f"{ROOT}/results/answers.json"))
findings = json.load(open(f"{ROOT}/results/findings.json"))

submission = {
    "api_key": "IVY26-D4BC016512F7",
    "candidate": {
        "name": "Rishi Prasad Sulakhe",
        "email": "rishiprasadsulakhe@gmail.com",
        "repo_url": "https://github.com/rishisulakhe/ivy-homes-assignment",
        "demo_url": ""
    },
    "answers": answers,
    "findings": findings,
}

with open(f"{ROOT}/submission.json", "w") as f:
    json.dump(submission, f, indent=2)

print("wrote submission.json")
print("answers:", {k: (v if not isinstance(v, (list, dict)) else (f"[{len(v)} items]" if isinstance(v, list) else v))
                  for k, v in answers.items()})
print("findings:", len(findings))
