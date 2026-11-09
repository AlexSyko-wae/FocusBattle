// Arte original de FocusBattle. Cada cuadrícula tiene 16 × 16 píxeles.
export const sprites = {
  bat: [
    '................','o..............o','oo....o..o....oo','olo...oooo...olo',
    'ollo..oppo..ollo','olllo.oppo.olllo','olllooppppoolllo','olllllpyyplllllo',
    '.ollllpoopllllo.','..olllpppplllo..','...oolpppploo...','.....oppppo.....',
    '......oooo......','......o..o......','................','................',
  ],
  mage: [
    '.......p........','......ppp.......','.....ppppp......','....pppyppp.....',
    '...opppppppo....','..ooooooooooo...','.....odddo...c..','.....oyyyo..ccc.',
    '....opppppo..c..','...opppppppo.c..','..oppppyppppo.c.', '..oppppyppppo.c.',
    '...opppppppo.c..','...opppppppo.c..','...ooooooooo.c..','................',
  ],
  dragon: [
    '..y........y....','..ry......yr....','..orroooorro....','...orrrrrro.....',
    '..orrwrrwrro....','.orrrrorrrrro...','ororrrrrrrroro..','orroorrroorrro..',
    'orrrrraaarrro...','.orrrraaarrro...','..orrryaayrrro..','...orrraaarrro..',
    '..orrrrooorrrro.','.orrrro..orrrro.','.ooooo....ooooo.','................',
  ],
  hero: [
    '................','.....oooo.......','....oyyyyo......','....oyyyyo......',
    '....osssso......','....osdsso......','.....osso.......','...opppppoo..c..',
    '..oppaappaao.c..','..oppaappaao.c..','..oppaaaasso.c..','...opaaaao..oco.',
    '....oaaoao...c..','....oaooao......','...oddo.ddo.....','...oooo.ooo.....',
  ],
  slime: [
    '................','................','................','.......gg.......',
    '.....oggggo.....','....ogwwgggo....','...ogwwgggggo...','..oggggggggggo..',
    '..oggggggggggo..','.ogggodggodgggo.','.ogggodggodgggo.','.oggggggggggggo.',
    '.oggggooogggggo.','..oggggggggggo..','...oooooooooo...','................',
  ],
  ghost: [
    '................','......oooo......','....oolllloo....','...ollllllllo...',
    '..olwwlllllllo..','..olwllllllllo..','..olloodloollo..','..olloydloyolo..',
    '..olllooloollo..','...ollllllllo...','..ollllllllo....','.ollllllllllo...',
    '..ollllllllllo..','...olloollooo...','....oo..oo......','................',
  ],
  guardian: [
    '..yo........oy..','..oyoo....ooyo..','...oyoooooyo....','...odddddddo....',
    '..odaddddaddo...','..oddroordddo...','...odddddddo....','.oooddoooddooo..',
    'oydddaaaaddddyo.','odddaaaraaadddo.','odddaaaraaadddo.','.ooooddddoooo...',
    '....oddddo......','...oddoooddo....','..odddo.odddo...','..ooooo.ooooo...',
  ],
} as const;
export type SpriteKind = keyof typeof sprites;
export const pixelPalette: Record<string,string> = {
  o:'#15182b',y:'#E9B949',s:'#edbea4',p:'#7855C8',a:'#8194b1',d:'#3a4663',
  g:'#43BFA0',w:'#d7fff2',l:'#bca8ec',r:'#D75B65',c:'#8ce8f0',
};
