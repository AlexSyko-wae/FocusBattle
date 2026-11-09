"""Original short retro sound effects, synthesized locally, without external assets."""
from pathlib import Path
import math, struct, wave
out = Path('mobile/assets/sounds')
out.mkdir(parents=True, exist_ok=True)
sounds = {
 'attack': [(220,.04),(110,.07)], 'defend': [(420,.04),(280,.09)],
 'heal': [(440,.07),(554,.07),(659,.12)], 'correct': [(659,.06),(880,.13)],
 'wrong': [(240,.08),(160,.13)], 'victory': [(523,.08),(659,.08),(784,.08),(1047,.20)],
 'special': [(330,.05),(440,.05),(660,.05),(880,.14)], 'defeat': [(330,.09),(247,.09),(165,.18)],
}
rate=22050
for name,notes in sounds.items():
 samples=[]
 for frequency,duration in notes:
  count=int(rate*duration)
  for i in range(count):
   envelope=min(1,i/(rate*.008))*(1-i/count)**.7
   value=(1 if math.sin(2*math.pi*frequency*i/rate)>=0 else -1)*.12*envelope
   samples.append(struct.pack('<h',int(value*32767)))
  samples.extend([b'\0\0']*int(rate*.015))
 with wave.open(str(out/f'{name}.wav'),'wb') as audio:
  audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(rate);audio.writeframes(b''.join(samples))
print(f'Generated {len(sounds)} original sound effects')
