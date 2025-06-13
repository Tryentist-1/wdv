from datetime import datetime

idea = input("💡 What's your new idea? ")

timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

entry = f"\n[{timestamp}] {idea}"

with open("ideas.txt", "a") as f:
    f.write(entry)

print("✨ Idea saved to ideas.txt!")
