import type { Article } from '@/lib/learn/types'

export const history: Article = {
  slug: 'history-of-falling-sand-games',
  title: 'A short history of falling-sand games',
  description:
    'From a 2005 Java applet on a Japanese blog to Powder Game, The Powder Toy, Sandspiel and Noita: how the genre grew, and what Sandlab took from it.',
  published: '2026-10-09',
  updated: '2026-10-09',
  sections: [
    {
      heading: 'A Java applet on a Japanese blog (2005–2006)',
      paragraphs: [
        'The genre is usually traced to a Java applet posted in 2005 on DOFI-BLOG, a Japanese blog. On 24 December 2005 Simon Carless of GameSetWatch linked to it as "a Japanese in-browser Java game, \'World Of Sand\'". The translated description he quoted covers the whole idea: sand, water, salt and oil fall from the top of the screen, you draw walls with the mouse for them to flow around, and you can set the field on fire. The same author had also made a small game about killing a slug with salt.',
        'The applet spread through link sites. An archived overview on fallingsandgame.com describes "Falling Sand Game", also called "Hell of Sand", as an applet "first found on the Dofi Blog, later enlarged and rehosted by Chirag Mehta and then again by Falling Sand Game", with sand, water, salt and oil as its four main particles and the slug (namekuji) kept as an option. Wikipedia credits this rehosted version with turning the applet into a trend and giving the genre its name.',
        'By February 2006 there was a desktop version. Joystiq reported that Owen Piette had written wxSand from scratch as a standalone program, with a larger sandbox and without the fire tool, which he felt broke the calm of the thing. Wikipedia lists it as the first standalone falling-sand game.',
        'The core mechanism has barely changed since. The screen is a grid; each cell holds one material; on every step each cell follows a short local rule. Petri Purho, years later, summarised it for Noita: liquid pixels "first check if they can go down. If not, they check left and right." Compare densities before swapping and oil floats on water.',
      ],
    },
    {
      heading: 'Powder Game and Dan-Ball',
      paragraphs: [
        'Powder Game, also known as "Dust", lives on DAN-BALL, the Japanese site of the developer known as ha55ii. A fan-maintained timeline on the Dan-Ball Wiki, built from the author\'s own blog posts, dates version 1.0 to 6 April 2007. It started with a single element, powder, plus a block tool and wind. Water arrived ten days later, fire within the month, save and load in June 2007, and an upload feature in version 2.8 on 2 September 2007. Wikipedia also gives 2007. Its distinguishing feature was air: Powder Game runs a pressure-based fluid simulation, so wind and explosions push particles around rather than only gravity.',
        'Upload is what made it more than a toy. Players published their scenes to a shared board where others could vote for them or request deletion; the current game page lists weekly, monthly and user rankings, and states that after 12 hours a work is deleted automatically if it has more deletion requests than votes. Max Bittker, who later made Sandspiel, describes the Powder Game upload gallery of roughly 2007 to 2013 as "a beautiful micro-culture of people making games, toys, demos, propaganda, and art", and adds: "All this with no comment section!"',
        'Powder Game also shows how the genre survives platform changes. Java applets stopped working in mainstream browsers, and the Dan-Ball Wiki records version 9.2, on 5 June 2015, as the release that added HTML5 support, as a response to Chrome dropping Java.',
      ],
    },
    {
      heading: 'The Powder Toy and its save browser',
      paragraphs: [
        'The Powder Toy pushed the simulation much further. It was created by Stanislaw K. Skowronek, known as Skylark; the game\'s own splash screen reads "(c) 2008-9 Stanislaw K Skowronek", and Wikipedia\'s article on the game gives 2008 as its release year. (Wikipedia\'s list in its general falling-sand article says 2010, which conflicts with the copyright notice; we use 2008.) It simulates air pressure and velocity, heat, gravity and electricity, has a Lua API, and is free software under the GNU GPL. The project README credits Skowronek with designing the original and Simon Robertshaw with writing the website and running the server; development is now led by LBPHacker, Simon, jacob1 and other contributors. It was released on Steam in June 2024.',
        'Its online side is a save browser built into the game. You need an account to upload, and anyone can browse, open and modify what others have shared, which is how the community ends up with working reactors and computers. The front page is not hand-picked. In a 2013 forum thread, developer Pilihp64 put it plainly: "The front page works from votes", and "A save can only stay on the front page for one week." Another staff member noted in the same thread that moderators also add and drop saves. The one-week limit forces turnover, so new work gets a chance at attention instead of the same classics holding the top forever.',
      ],
    },
    {
      heading: 'Sandspiel and browser-native sharing',
      paragraphs: [
        'Sandspiel, made by Max Bittker in late 2018, was a deliberate attempt to bring back the Powder Game gallery. His write-up, "Making Sandspiel" (April 2019), is unusually candid about how it works. The particle simulation is written in Rust and compiled to WebAssembly, running on the CPU; each cell is a 32-bit struct holding its species, two registers and a clock. Only the wind is simulated on the GPU, using a fluid solver adapted from Pavel Dobryakov\'s WebGL implementation, with data passed back and forth so wind can move particles. The canvas is 300 by 300.',
        'The sharing design is the part that influenced later projects most. There are no accounts; Bittker "wanted to avoid dealing with accounts and authorization". The backend only allows reading, inserting and voting, so nobody can edit or delete someone else\'s post, and votes are de-duplicated by IP address, which he admits can be gamed. Each save is a lossless PNG in which a pixel\'s red, green and blue channels store a cell\'s species and two registers, so the browser\'s own image codec does the serialisation. Hosting was not free: Firestore reads pushed costs to about $50 a month, and moving roughly 60,000 records to Postgres cut that to about a tenth. Bittker reported "a couple thousand" daily players and "more than 70,000 creations", along with "a healthy remix culture of people making new takes on popular templates".',
        'A follow-up, Sandspiel Studio, signed "Max & Lu" in its README, lets people define their own elements with Scratch-like blocks and share them. It appeared on Hacker News in November 2022 and is still labelled beta.',
      ],
    },
    {
      heading: 'Noita: falling sand as a game engine',
      paragraphs: [
        'Every game above is a sandbox. Noita, by the Finnish studio Nolla Games (Petri Purho, Olli Harjola and Arvi Teikari), made the simulation the ground a roguelike is played on. It entered early access on 24 September 2019 and reached 1.0 on 15 October 2020. Its engine is called Falling Everything, and in Noita fire, liquid, gas and even falling chunks of terrain are simulated pixel by pixel, so a spell can melt a wall, flood a cave or set you on fire.',
        'Purho explained the engineering in his GDC 2019 talk "Exploring the Tech and Design of Noita" and an 80.lv interview the same spring. The world is too big to update every pixel every frame, so it is divided into 64×64 chunks, each keeping a "dirty rect" of the pixels that actually need updating. Falling sand has to be updated "from the bottom up". To use several CPU threads without two threads moving the same pixel, the world is updated in a checker pattern, four passes per frame, with each chunk allowed to move pixels 32 cells beyond its edges. Solid pieces are rigid bodies that remember which pixels belong to them, so when terrain breaks off it falls as one object and can shatter back into particles.',
        'Noita showed the genre\'s rules could carry a commercial game with stakes, not only a toy.',
      ],
    },
    {
      heading: 'Browser sandboxes today',
      paragraphs: [
        'The browser is again where most falling-sand games are played. Powder Game runs in HTML5. Sandboxels, by the R74n collective, was first released on 15 December 2021 and is written in plain HTML5 and JavaScript with no engine; its press kit says it has over 500 materials and that its YouTube and TikTok clips have drawn millions of views. It came to Steam on 16 May 2025 for under a dollar, while staying free in the browser.',
        'The newer change is where the simulation runs. The classic update loop scans the grid in order, and each cell may depend on what the previous cell just did, which is fine on a CPU and awkward on a GPU, where thousands of cells must be decided at once. WebGPU, which gives web pages general-purpose compute shaders, has led to several experiments; one, "A falling sand engine using WebGPU", was posted to Show HN in May 2023. To run in parallel, these engines need rules where each cell or small group of cells can be resolved independently in the same step.',
      ],
    },
    {
      heading: 'What Sandlab borrowed, and what it does differently',
      paragraphs: [
        'Sandlab, built solo by Piousangel, takes most of its community design from this history. The public gallery with votes and no comment section comes from Powder Game, as Bittker described it. Publishing without an account comes from Sandspiel. The "hot" view keeps a scene in contention for seven days, modelled on The Powder Toy\'s one-week front page, and remixing someone else\'s scene is a first-class action, as in both.',
        'The simulation is where it differs. Sandlab runs on WebGPU and uses a Margolus neighbourhood, a block cellular automaton first studied by Norman Margolus in 1984: the grid is cut into 2×2 blocks, each block is resolved on its own, and the block boundaries shift by one cell on every step, alternating between two positions. Because no block depends on another within a step, all 720,000 cells of its fixed 1200×600 grid can be updated in parallel on the GPU. Its 18 materials are defined as rows of data rather than code. A scene can be shared without the gallery at all: it is encoded into the URL hash, so the link itself is the save. There are no accounts.',
        'It is not the first WebGPU falling-sand game, and with 18 materials it is far smaller than The Powder Toy or Sandboxels. What it tries to do is keep the parts of this history that made people come back, a shared board and a reason to remix, on a simulation that runs entirely in the browser.',
      ],
    },
  ],
  sources: [
    { label: 'Wikipedia: Falling-sand game', url: 'https://en.wikipedia.org/wiki/Falling-sand_game' },
    {
      label: 'GameSetWatch: Welcome To The World Of Sand (24 December 2005, archived)',
      url: 'https://web.archive.org/web/20110926061423/http://www.gamesetwatch.com/2005/12/welcome_to_the_world_of_sand.php',
    },
    {
      label: 'Falling Sand Game: Overview (archived 2009)',
      url: 'https://web.archive.org/web/20090423105358/http://fallingsandgame.com/overview/index.html',
    },
    {
      label: 'Joystiq/Engadget: Falling Sand: The Sequel (15 February 2006)',
      url: 'https://www.engadget.com/2006-02-15-falling-sand-the-sequel.html',
    },
    { label: 'DAN-BALL: Powder Game', url: 'https://dan-ball.jp/en/javagame/dust/' },
    { label: 'Dan-Ball Wiki: Powder Game', url: 'https://danball.fandom.com/wiki/Powder_Game' },
    { label: 'Dan-Ball Wiki: Powder Game Timeline', url: 'https://danball.fandom.com/wiki/Powder_Game_Timeline' },
    { label: 'Wikipedia: The Powder Toy', url: 'https://en.wikipedia.org/wiki/The_Powder_Toy' },
    { label: 'The Powder Toy', url: 'https://powdertoy.co.uk/' },
    {
      label: 'The Powder Toy README (GitHub)',
      url: 'https://github.com/The-Powder-Toy/The-Powder-Toy/blob/master/README.md',
    },
    {
      label: 'The Powder Toy forum: front page discussion (2013)',
      url: 'https://powdertoy.co.uk/Discussions/Thread/View.html?Thread=17449',
    },
    {
      label: 'Rock Paper Shotgun: From falling sand to Falling Everything (10 October 2019)',
      url: 'https://www.rockpapershotgun.com/2019/10/10/from-falling-sand-to-falling-everything-the-simulation-games-that-inspired-noita/',
    },
    { label: 'Max Bittker: Making Sandspiel', url: 'https://maxbittker.com/making-sandspiel/' },
    { label: 'Sandspiel Studio README (GitHub)', url: 'https://github.com/MaxBittker/sandspiel-studio' },
    {
      label: 'Hacker News: Sandspiel Studio: Cellular Automata Designer (November 2022)',
      url: 'https://news.ycombinator.com/item?id=33428458',
    },
    { label: 'Wikipedia: Noita (video game)', url: 'https://en.wikipedia.org/wiki/Noita_(video_game)' },
    {
      label: 'GDC Vault: Exploring the Tech and Design of Noita (Petri Purho, GDC 2019)',
      url: 'https://www.gdcvault.com/play/1025695/Exploring-the-Tech-and-Design',
    },
    {
      label: '80.lv: Noita, a Game Based on Falling Sand Simulation (5 April 2019)',
      url: 'https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/',
    },
    { label: 'Sandboxels press kit (R74n)', url: 'https://sandboxels.r74n.com/presskit' },
    {
      label: 'Show HN: A falling sand engine using WebGPU (May 2023)',
      url: 'https://news.ycombinator.com/item?id=36106262',
    },
    { label: 'Wikipedia: Block cellular automaton', url: 'https://en.wikipedia.org/wiki/Block_cellular_automaton' },
  ],
}
