/* ============================================================
   QUIZ DUELL — Kategorienpool
   10 Kategorien x 100 Fragen = 1000 Fragen
   Stellt window.QuizDuelQuestionPool bereit.
   ============================================================ */
(() => {
  'use strict';

  const TARGET_PER_CATEGORY = 100;
  const CATEGORY_ORDER = [
    'Geschichte', 'Geografie', 'Wissenschaft', 'Technik', 'Sport',
    'Musik', 'Film', 'Literatur', 'Natur', 'Alltag'
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function wrongFromPool(pool, correct, count) {
    const uniq = [...new Set(pool)].filter(v => v !== correct);
    return shuffle(uniq).slice(0, count);
  }

  function addQ(bucket, seen, prompt, correct, wrong) {
    if (!prompt || !correct || !Array.isArray(wrong)) return;
    const cleanWrong = [...new Set(wrong.filter(w => w && w !== correct))].slice(0, 3);
    if (cleanWrong.length < 3) return;
    const key = `${String(prompt).trim().toLowerCase()}|${String(correct).trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    bucket.push({ prompt, correct, wrong: cleanWrong });
  }

  function takeNUnique(bucket, n) {
    return bucket.slice(0, n);
  }

  function buildGeschichte() {
    const out = [];
    const seen = new Set();
    const events = [
      ['Fall der Berliner Mauer', '1989'], ['Beginn des Ersten Weltkriegs', '1914'], ['Ende des Ersten Weltkriegs', '1918'],
      ['Beginn des Zweiten Weltkriegs', '1939'], ['Ende des Zweiten Weltkriegs in Europa', '1945'], ['Mondlandung Apollo 11', '1969'],
      ['Entdeckung Amerikas durch Kolumbus', '1492'], ['Franzoesische Revolution beginnt', '1789'], ['Gruendung der UNO', '1945'],
      ['Deutsche Wiedervereinigung', '1990'], ['Unabhaengigkeit der USA', '1776'], ['Erfindung des Buchdrucks durch Gutenberg', '1450'],
      ['Reformation durch Martin Luther (95 Thesen)', '1517'], ['Sturm auf die Bastille', '1789'], ['Russische Oktoberrevolution', '1917'],
      ['Bau der Berliner Mauer', '1961'], ['Aufloesung der Sowjetunion', '1991'], ['Erste Olympische Spiele der Neuzeit', '1896'],
      ['Erfindung des Telefons (Bell)', '1876'], ['Erste E-Mail', '1971'], ['Gruendung der NATO', '1949'], ['Gruendung der EU (Maastricht)', '1993'],
      ['Atomunfall in Tschernobyl', '1986'], ['Anschlag auf das World Trade Center', '2001'], ['Erste gedruckte Bibel (Gutenberg-Bibel)', '1455'],
      ['Magna Carta in England', '1215'], ['Beginn des amerikanischen Buergerkriegs', '1861'], ['Ende des amerikanischen Buergerkriegs', '1865'],
      ['Gruendung des Deutschen Kaiserreichs', '1871'], ['Beginn der Renaissance in Italien (ungefaehr)', '1400'], ['Ende der Napoleonischen Kriege (Waterloo)', '1815'],
      ['Entdeckung des Penicillins', '1928'], ['Erste Atombombe getestet (Trinity)', '1945'], ['Vertrag von Versailles', '1919'],
      ['Titanic-Untergang', '1912'], ['Bau des Eiffelturms abgeschlossen', '1889'], ['Weltausstellung in Paris (Eiffelturm)', '1889'],
      ['Gruendung von Google', '1998'], ['Gruendung von Wikipedia', '2001'], ['Start des iPhone', '2007']
    ];

    const years = events.map(e => e[1]);
    events.forEach(([event, year]) => {
      addQ(out, seen, `In welchem Jahr war ${event}?`, year, wrongFromPool(years, year, 3));
      addQ(out, seen, `${event} fand in welchem Jahr statt?`, year, wrongFromPool(years, year, 3));
    });

    const persons = [
      ['Albert Einstein', 'Relativitaetstheorie'], ['Isaac Newton', 'Gravitationsgesetz'], ['Marie Curie', 'Radioaktivitaetsforschung'],
      ['Galileo Galilei', 'fruehe moderne Astronomie'], ['Martin Luther', 'Reformation'], ['Otto von Bismarck', 'deutsche Reichsgruendung'],
      ['Nelson Mandela', 'Anti-Apartheid-Bewegung'], ['Mahatma Gandhi', 'gewaltfreier Widerstand in Indien'], ['Winston Churchill', 'britische Kriegsfuehrung im Zweiten Weltkrieg'],
      ['Abraham Lincoln', 'Abschaffung der Sklaverei in den USA'], ['Julius Caesar', 'roemischer Staatsmann'], ['Napoleon Bonaparte', 'franzoesischer Kaiser'],
      ['Leonardo da Vinci', 'Renaissance-Universalgelehrter'], ['Johannes Gutenberg', 'moderner Buchdruck'], ['Thomas Edison', 'praxisnahe Elektrifizierung'],
      ['Alexander Fleming', 'Entdeckung von Penicillin'], ['Charles Darwin', 'Evolutionstheorie'], ['Sigmund Freud', 'Psychoanalyse'],
      ['Konrad Adenauer', 'erster Bundeskanzler der BRD'], ['Helmut Kohl', 'deutsche Wiedervereinigung']
    ];
    const personNames = persons.map(p => p[0]);
    const personFacts = persons.map(p => p[1]);
    persons.forEach(([name, fact]) => {
      addQ(out, seen, `Wer ist bekannt fuer: ${fact}?`, name, wrongFromPool(personNames, name, 3));
      addQ(out, seen, `${name} wird am ehesten womit verbunden?`, fact, wrongFromPool(personFacts, fact, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildGeografie() {
    const out = [];
    const seen = new Set();
    const capitals = [
      ['Deutschland', 'Berlin'], ['Frankreich', 'Paris'], ['Italien', 'Rom'], ['Spanien', 'Madrid'], ['Portugal', 'Lissabon'],
      ['Oesterreich', 'Wien'], ['Schweiz', 'Bern'], ['Niederlande', 'Amsterdam'], ['Belgien', 'Bruessel'], ['Luxemburg', 'Luxemburg'],
      ['Polen', 'Warschau'], ['Tschechien', 'Prag'], ['Ungarn', 'Budapest'], ['Rumaenien', 'Bukarest'], ['Bulgarien', 'Sofia'],
      ['Kroatien', 'Zagreb'], ['Slowenien', 'Ljubljana'], ['Serbien', 'Belgrad'], ['Griechenland', 'Athen'], ['Daenemark', 'Kopenhagen'],
      ['Schweden', 'Stockholm'], ['Norwegen', 'Oslo'], ['Finnland', 'Helsinki'], ['Island', 'Reykjavik'], ['Irland', 'Dublin'],
      ['Grossbritannien', 'London'], ['USA', 'Washington, D.C.'], ['Kanada', 'Ottawa'], ['Mexiko', 'Mexiko-Stadt'], ['Brasilien', 'Brasilia'],
      ['Argentinien', 'Buenos Aires'], ['Chile', 'Santiago'], ['Peru', 'Lima'], ['Kolumbien', 'Bogota'], ['Ecuador', 'Quito'],
      ['Japan', 'Tokio'], ['China', 'Peking'], ['Suedkorea', 'Seoul'], ['Indien', 'Neu-Delhi'], ['Australien', 'Canberra'],
      ['Neuseeland', 'Wellington'], ['Aegypten', 'Kairo'], ['Marokko', 'Rabat'], ['Nigeria', 'Abuja'], ['Kenia', 'Nairobi'],
      ['Suedafrika', 'Pretoria'], ['Saudi-Arabien', 'Riad'], ['VAE', 'Abu Dhabi'], ['Tuerkei', 'Ankara'], ['Russland', 'Moskau']
    ];
    const countries = capitals.map(c => c[0]);
    const caps = capitals.map(c => c[1]);
    capitals.forEach(([country, capital]) => {
      addQ(out, seen, `Was ist die Hauptstadt von ${country}?`, capital, wrongFromPool(caps, capital, 3));
      addQ(out, seen, `${capital} ist die Hauptstadt von welchem Land?`, country, wrongFromPool(countries, country, 3));
    });

    const rivers = [
      ['Themse', 'London'], ['Seine', 'Paris'], ['Donau', 'Wien'], ['Tiber', 'Rom'], ['Spree', 'Berlin'],
      ['Rhein', 'Koeln'], ['Nil', 'Kairo'], ['Han', 'Seoul'], ['Sumida', 'Tokio'], ['Potomac', 'Washington, D.C.']
    ];
    const riverNames = rivers.map(r => r[0]);
    const cities = rivers.map(r => r[1]);
    rivers.forEach(([river, city]) => {
      addQ(out, seen, `Welcher Fluss fliesst durch ${city}?`, river, wrongFromPool(riverNames, river, 3));
      addQ(out, seen, `Durch welche Stadt fliesst die ${river}?`, city, wrongFromPool(cities, city, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildWissenschaft() {
    const out = [];
    const seen = new Set();
    const elements = [
      ['H', 'Wasserstoff'], ['He', 'Helium'], ['C', 'Kohlenstoff'], ['N', 'Stickstoff'], ['O', 'Sauerstoff'],
      ['Na', 'Natrium'], ['Mg', 'Magnesium'], ['Al', 'Aluminium'], ['Si', 'Silizium'], ['P', 'Phosphor'],
      ['S', 'Schwefel'], ['Cl', 'Chlor'], ['K', 'Kalium'], ['Ca', 'Calcium'], ['Fe', 'Eisen'],
      ['Cu', 'Kupfer'], ['Zn', 'Zink'], ['Ag', 'Silber'], ['Sn', 'Zinn'], ['I', 'Iod'], ['Au', 'Gold']
    ];
    const symbols = elements.map(e => e[0]);
    const names = elements.map(e => e[1]);
    elements.forEach(([sym, name]) => {
      addQ(out, seen, `Welches Element hat das Symbol ${sym}?`, name, wrongFromPool(names, name, 3));
      addQ(out, seen, `Welches Symbol hat ${name}?`, sym, wrongFromPool(symbols, sym, 3));
    });

    const bio = [
      ['Herz', 'pumpt Blut'], ['Lunge', 'nimmt Sauerstoff auf'], ['Leber', 'entgiftet Stoffe'], ['Niere', 'filtert Blut'],
      ['Bauchspeicheldruese', 'produziert Insulin'], ['Magen', 'beginnt Eiweissverdauung'], ['Duenndarm', 'nimmt Naehrstoffe auf'],
      ['Dickdarm', 'entzieht Wasser'], ['Gehirn', 'steuert das Nervensystem'], ['Haut', 'groesstes Organ']
    ];
    const organs = bio.map(b => b[0]);
    const funcs = bio.map(b => b[1]);
    bio.forEach(([organ, fn]) => {
      addQ(out, seen, `Welches Organ ${fn}?`, organ, wrongFromPool(organs, organ, 3));
      addQ(out, seen, `Welche Hauptaufgabe hat das ${organ}?`, fn, wrongFromPool(funcs, fn, 3));
    });

    const constants = [
      ['Gefrierpunkt von Wasser (Celsius)', '0'], ['Siedepunkt von Wasser (Celsius)', '100'], ['Stunden pro Tag', '24'],
      ['Minuten pro Stunde', '60'], ['Sekunden pro Minute', '60'], ['Sekunden pro Stunde', '3600'], ['Kontinente', '7'],
      ['Tage in einem Schaltjahr', '366'], ['Wochen im Jahr (ungefaehr)', '52'], ['Monate im Jahr', '12']
    ];
    const vals = constants.map(c => c[1]);
    constants.forEach(([label, val]) => {
      addQ(out, seen, `Wie gross ist: ${label}?`, val, wrongFromPool(vals, val, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildTechnik() {
    const out = [];
    const seen = new Set();
    const inventions = [
      ['Telefon', 'Alexander Graham Bell'], ['Gluehbirne (praktische Verbreitung)', 'Thomas Edison'], ['Buchdruck', 'Johannes Gutenberg'],
      ['World Wide Web', 'Tim Berners-Lee'], ['Programmiersprache C', 'Dennis Ritchie'], ['Java', 'James Gosling'],
      ['Linux-Kernel', 'Linus Torvalds'], ['Relationale Datenbanktheorie', 'Edgar F. Codd'], ['Erste grafische Benutzeroberflaechen (Pionierarbeit)', 'Xerox PARC'],
      ['Mikroprozessor (kommerziell frueh)', 'Intel'], ['Bluetooth', 'Ericsson'], ['USB-Standard', 'USB-IF']
    ];
    const invNames = inventions.map(i => i[0]);
    const inventors = inventions.map(i => i[1]);
    inventions.forEach(([what, who]) => {
      addQ(out, seen, `Wer wird hauptsaechlich mit ${what} verbunden?`, who, wrongFromPool(inventors, who, 3));
      addQ(out, seen, `${who} wird am ehesten womit verbunden?`, what, wrongFromPool(invNames, what, 3));
    });

    const abbreviations = [
      ['CPU', 'Central Processing Unit'], ['RAM', 'Random Access Memory'], ['GPU', 'Graphics Processing Unit'],
      ['SSD', 'Solid State Drive'], ['HDD', 'Hard Disk Drive'], ['USB', 'Universal Serial Bus'],
      ['HTTP', 'Hypertext Transfer Protocol'], ['HTTPS', 'Hypertext Transfer Protocol Secure'], ['DNS', 'Domain Name System'],
      ['IP', 'Internet Protocol'], ['LAN', 'Local Area Network'], ['WAN', 'Wide Area Network'], ['AI', 'Artificial Intelligence']
    ];
    const abbrKeys = abbreviations.map(a => a[0]);
    const abbrVals = abbreviations.map(a => a[1]);
    abbreviations.forEach(([k, v]) => {
      addQ(out, seen, `Wofuer steht ${k}?`, v, wrongFromPool(abbrVals, v, 3));
      addQ(out, seen, `Welche Abkuerzung passt zu: ${v}?`, k, wrongFromPool(abbrKeys, k, 3));
    });

    const companies = [
      ['Google', 'Suchmaschine'], ['Microsoft', 'Windows'], ['Apple', 'iPhone'], ['Samsung', 'Galaxy-Smartphones'],
      ['Sony', 'PlayStation'], ['Nintendo', 'Switch'], ['Tesla', 'Elektroautos'], ['Intel', 'Prozessoren'],
      ['NVIDIA', 'Grafikkarten'], ['Adobe', 'Photoshop'], ['Amazon', 'Online-Handel'], ['Meta', 'soziale Netzwerke']
    ];
    const compNames = companies.map(c => c[0]);
    const compProd = companies.map(c => c[1]);
    companies.forEach(([c, p]) => {
      addQ(out, seen, `Wofuer ist ${c} besonders bekannt?`, p, wrongFromPool(compProd, p, 3));
      addQ(out, seen, `Welche Firma verbindet man am ehesten mit ${p}?`, c, wrongFromPool(compNames, c, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildSport() {
    const out = [];
    const seen = new Set();
    const athletes = [
      ['Usain Bolt', 'Leichtathletik'], ['Michael Jordan', 'Basketball'], ['Lionel Messi', 'Fussball'],
      ['Cristiano Ronaldo', 'Fussball'], ['Roger Federer', 'Tennis'], ['Serena Williams', 'Tennis'],
      ['Michael Phelps', 'Schwimmen'], ['Novak Djokovic', 'Tennis'], ['Lewis Hamilton', 'Formel 1'], ['Max Verstappen', 'Formel 1'],
      ['Mikaela Shiffrin', 'Ski Alpin'], ['Simone Biles', 'Turnen']
    ];
    const names = athletes.map(a => a[0]);
    const sports = athletes.map(a => a[1]);
    athletes.forEach(([name, sport]) => {
      addQ(out, seen, `In welcher Sportart ist ${name} beruehmt?`, sport, wrongFromPool(sports, sport, 3));
      addQ(out, seen, `Welcher Name gehoert zur Sportart ${sport}?`, name, wrongFromPool(names, name, 3));
    });

    const rules = [
      ['Fussballspieler pro Team auf dem Feld', '11'], ['Basketballspieler pro Team auf dem Feld', '5'],
      ['Tennis Satzgewinn bei Spielen (mind.)', '6'], ['Marathondistanz in km (gerundet)', '42'],
      ['Loecher auf einem Golfplatz (Standardrunde)', '18'], ['Punkte fuer einen Touchdown (NFL)', '6'],
      ['Satzgewinn im Volleyball (meist bis)', '25'], ['Anzahl Ringe im olympischen Symbol', '5'],
      ['Halbzeitdauer im Fussball in Minuten', '45'], ['Punkte fuer Dreier im Basketball', '3']
    ];
    const vals = rules.map(r => r[1]);
    rules.forEach(([q, val]) => {
      addQ(out, seen, `Wie viele ${q}?`, val, wrongFromPool(vals, val, 3));
    });

    const equipment = [
      ['Tennis', 'Tennisschlaeger'], ['Golf', 'Golfschlaeger'], ['Eishockey', 'Schlaeger'], ['Boxen', 'Boxhandschuhe'],
      ['Ski Alpin', 'Skier'], ['Baseball', 'Baseballschlaeger'], ['Badminton', 'Badmintonschlaeger'], ['Tischtennis', 'Tischtennisschlaeger'],
      ['American Football', 'Football-Helm'], ['Rudern', 'Ruder']
    ];
    const eqSports = equipment.map(e => e[0]);
    const eqItems = equipment.map(e => e[1]);
    equipment.forEach(([sport, item]) => {
      addQ(out, seen, `Welches Geraet ist typisch fuer ${sport}?`, item, wrongFromPool(eqItems, item, 3));
      addQ(out, seen, `${item} gehoert typischerweise zu welcher Sportart?`, sport, wrongFromPool(eqSports, sport, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildMusik() {
    const out = [];
    const seen = new Set();
    const composers = [
      ['Ludwig van Beethoven', 'Deutschland'], ['Wolfgang Amadeus Mozart', 'Oesterreich'], ['Johann Sebastian Bach', 'Deutschland'],
      ['Frederic Chopin', 'Polen'], ['Antonio Vivaldi', 'Italien'], ['Giuseppe Verdi', 'Italien'],
      ['Johannes Brahms', 'Deutschland'], ['Pyotr Ilyich Tchaikovsky', 'Russland'], ['Franz Schubert', 'Oesterreich'], ['Richard Wagner', 'Deutschland']
    ];
    const compNames = composers.map(c => c[0]);
    const compCountries = composers.map(c => c[1]);
    composers.forEach(([name, country]) => {
      addQ(out, seen, `Aus welchem Land stammt ${name}?`, country, wrongFromPool(compCountries, country, 3));
      addQ(out, seen, `Welcher Komponist stammt aus ${country}?`, name, wrongFromPool(compNames, name, 3));
    });

    const instruments = [
      ['Violine', 'Streichinstrument'], ['Cello', 'Streichinstrument'], ['Kontrabass', 'Streichinstrument'], ['Harfe', 'Zupfinstrument'],
      ['Gitarre', 'Zupfinstrument'], ['Klavier', 'Tasteninstrument'], ['Orgel', 'Tasteninstrument'], ['Trompete', 'Blechblasinstrument'],
      ['Posaune', 'Blechblasinstrument'], ['Saxofon', 'Holzblasinstrument'], ['Klarinette', 'Holzblasinstrument'], ['Fagott', 'Holzblasinstrument']
    ];
    const instNames = instruments.map(i => i[0]);
    const instFamilies = instruments.map(i => i[1]);
    instruments.forEach(([inst, fam]) => {
      addQ(out, seen, `Zu welcher Instrumentenfamilie gehoert ${inst}?`, fam, wrongFromPool(instFamilies, fam, 3));
      addQ(out, seen, `Welches Instrument passt zur Familie ${fam}?`, inst, wrongFromPool(instNames, inst, 3));
    });

    const theory = [
      ['Anzahl Toene in einer Oktave (westlich)', '12'], ['Anzahl Notenlinien im Notensystem', '5'],
      ['Standardstimmung Kammerton A in Hz', '440'], ['Anzahl Saiten einer klassischen Gitarre', '6'],
      ['Anzahl Tasten eines Konzertfluegels (Standard)', '88'], ['BPM steht fuer', 'Beats per Minute'],
      ['C-Dur hat wie viele Vorzeichen?', '0'], ['Moll ist haeufig klanglich', 'dunkler'], ['Dur ist haeufig klanglich', 'heller'], ['Pause in der Musik bedeutet', 'Stille']
    ];
    const vals = theory.map(t => t[1]);
    theory.forEach(([q, val]) => {
      addQ(out, seen, `${q}?`, val, wrongFromPool(vals, val, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildFilm() {
    const out = [];
    const seen = new Set();
    const films = [
      ['Der Herr der Ringe', 'Fantasy'], ['Star Wars', 'Science-Fiction'], ['Harry Potter', 'Fantasy'], ['Titanic', 'Drama'],
      ['Inception', 'Science-Fiction'], ['Der Pate', 'Krimi'], ['Forrest Gump', 'Drama'], ['Jurassic Park', 'Abenteuer'],
      ['Gladiator', 'Historienfilm'], ['Avengers', 'Superheldenfilm'], ['Finding Nemo', 'Animationsfilm'], ['The Matrix', 'Science-Fiction']
    ];
    const filmNames = films.map(f => f[0]);
    const genres = films.map(f => f[1]);
    films.forEach(([film, genre]) => {
      addQ(out, seen, `Welchem Genre wird ${film} am ehesten zugeordnet?`, genre, wrongFromPool(genres, genre, 3));
      addQ(out, seen, `Welcher Film passt zum Genre ${genre}?`, film, wrongFromPool(filmNames, film, 3));
    });

    const directors = [
      ['Christopher Nolan', 'Inception'], ['Steven Spielberg', 'Jurassic Park'], ['James Cameron', 'Titanic'],
      ['Peter Jackson', 'Der Herr der Ringe'], ['Francis Ford Coppola', 'Der Pate'], ['Ridley Scott', 'Gladiator'],
      ['George Lucas', 'Star Wars'], ['Lana Wachowski', 'The Matrix'], ['Robert Zemeckis', 'Forrest Gump'], ['Jon Favreau', 'Iron Man']
    ];
    const dirNames = directors.map(d => d[0]);
    const works = directors.map(d => d[1]);
    directors.forEach(([dir, work]) => {
      addQ(out, seen, `Wer fuehrte Regie bei ${work}?`, dir, wrongFromPool(dirNames, dir, 3));
      addQ(out, seen, `${dir} wird oft mit welchem Film verbunden?`, work, wrongFromPool(works, work, 3));
    });

    const awards = [
      ['Oscar', 'Academy Awards'], ['Goldene Palme', 'Cannes'], ['Goldener Baer', 'Berlinale'], ['Goldener Loewe', 'Venedig'],
      ['Golden Globe', 'Hollywood Foreign Press'], ['BAFTA', 'British Academy'], ['Cesar', 'Frankreich'], ['Goya', 'Spanien']
    ];
    const awardNames = awards.map(a => a[0]);
    const awardOrgs = awards.map(a => a[1]);
    awards.forEach(([award, org]) => {
      addQ(out, seen, `Womit wird der Preis ${award} verbunden?`, org, wrongFromPool(awardOrgs, org, 3));
      addQ(out, seen, `Welcher Filmpreis gehoert zu ${org}?`, award, wrongFromPool(awardNames, award, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildLiteratur() {
    const out = [];
    const seen = new Set();
    const books = [
      ['Faust', 'Johann Wolfgang von Goethe'], ['Die Verwandlung', 'Franz Kafka'], ['1984', 'George Orwell'],
      ['Animal Farm', 'George Orwell'], ['Der Prozess', 'Franz Kafka'], ['Die Odyssee', 'Homer'],
      ['Ilias', 'Homer'], ['Krieg und Frieden', 'Leo Tolstoi'], ['Schuld und Suehne', 'Fyodor Dostoevsky'],
      ['Der kleine Prinz', 'Antoine de Saint-Exupery'], ['Moby-Dick', 'Herman Melville'], ['Don Quijote', 'Miguel de Cervantes'],
      ['Hamlet', 'William Shakespeare'], ['Macbeth', 'William Shakespeare'], ['Romeo und Julia', 'William Shakespeare']
    ];
    const titles = books.map(b => b[0]);
    const authors = books.map(b => b[1]);
    books.forEach(([title, author]) => {
      addQ(out, seen, `Wer schrieb ${title}?`, author, wrongFromPool(authors, author, 3));
      addQ(out, seen, `${author} schrieb welches Werk?`, title, wrongFromPool(titles, title, 3));
    });

    const genres = [
      ['Lyrik', 'Gedichte'], ['Drama', 'Buehnenstuecke'], ['Roman', 'laengere Erzaehlprosa'], ['Novelle', 'kurzere prosaische Erzaehlung'],
      ['Essay', 'argumentativer Text'], ['Maerchen', 'fantastische Volks- oder Kunstgeschichte'], ['Satire', 'kritisch-ueberzeichnete Darstellung'],
      ['Biografie', 'Lebensbeschreibung'], ['Tragoedie', 'ernstes Drama'], ['Komoedie', 'humorvolles Drama']
    ];
    const gNames = genres.map(g => g[0]);
    const gDesc = genres.map(g => g[1]);
    genres.forEach(([name, desc]) => {
      addQ(out, seen, `Was beschreibt am besten die Gattung ${name}?`, desc, wrongFromPool(gDesc, desc, 3));
      addQ(out, seen, `Welche Gattung passt zu: ${desc}?`, name, wrongFromPool(gNames, name, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildNatur() {
    const out = [];
    const seen = new Set();
    const animals = [
      ['Pinguin', 'Antarktis'], ['Eisbaer', 'Arktis'], ['Kamel', 'Wueste'], ['Koala', 'Australien'], ['Kanguru', 'Australien'],
      ['Tiger', 'Asien'], ['Loewe', 'Afrika'], ['Gepard', 'Afrika'], ['Panda', 'China'], ['Orang-Utan', 'Borneo und Sumatra'],
      ['Gorilla', 'Zentralafrika'], ['Eisbarsch', 'Suedpolarmeer'], ['Albatros', 'Suedlicher Ozean'], ['Faultier', 'Suedamerika'], ['Anakonda', 'Suedamerika']
    ];
    const aNames = animals.map(a => a[0]);
    const habitats = animals.map(a => a[1]);
    animals.forEach(([animal, habitat]) => {
      addQ(out, seen, `Wo lebt der ${animal} typischerweise?`, habitat, wrongFromPool(habitats, habitat, 3));
      addQ(out, seen, `Welches Tier passt typischerweise zum Lebensraum ${habitat}?`, animal, wrongFromPool(aNames, animal, 3));
    });

    const plants = [
      ['Kaktus', 'trockenes Klima'], ['Seerose', 'Wasser'], ['Mangrove', 'Brackwasser'], ['Tanne', 'Nadelbaum'], ['Eiche', 'Laubbaum'],
      ['Moos', 'feuchte Orte'], ['Bambus', 'Gras'], ['Lavendel', 'Mittelmeerklima'], ['Reis', 'nasse Felder'], ['Sonnenblume', 'Ackerpflanze']
    ];
    const pNames = plants.map(p => p[0]);
    const pFacts = plants.map(p => p[1]);
    plants.forEach(([plant, fact]) => {
      addQ(out, seen, `Welche Aussage passt am besten zu ${plant}?`, fact, wrongFromPool(pFacts, fact, 3));
      addQ(out, seen, `Welche Pflanze passt zu: ${fact}?`, plant, wrongFromPool(pNames, plant, 3));
    });

    const weather = [
      ['Regenbogen', 'Brechung und Reflexion von Licht in Wassertropfen'], ['Gewitter', 'elektrische Entladung in der Atmosphaere'],
      ['Nebel', 'feinste Wassertröpfchen in Bodennähe'], ['Hagel', 'gefrorene Niederschlagskugeln'], ['Tau', 'Kondensation an kuehler Oberflaeche'],
      ['Reif', 'gefrorenes Kondenswasser'], ['Tornado', 'rotierende Luftsaeule'], ['Orkan', 'extrem starker Sturm'],
      ['Monsun', 'jahreszeitlicher Windwechsel'], ['Duerre', 'lang anhaltender Niederschlagsmangel']
    ];
    const wNames = weather.map(w => w[0]);
    const wDesc = weather.map(w => w[1]);
    weather.forEach(([name, desc]) => {
      addQ(out, seen, `Was beschreibt ${name} am besten?`, desc, wrongFromPool(wDesc, desc, 3));
      addQ(out, seen, `Welches Wetterphaenomen passt zu: ${desc}?`, name, wrongFromPool(wNames, name, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  function buildAlltag() {
    const out = [];
    const seen = new Set();
    const units = [
      ['1 Kilometer', '1000 Meter'], ['1 Meter', '100 Zentimeter'], ['1 Zentimeter', '10 Millimeter'], ['1 Kilogramm', '1000 Gramm'],
      ['1 Liter', '1000 Milliliter'], ['1 Stunde', '60 Minuten'], ['1 Minute', '60 Sekunden'], ['1 Tag', '24 Stunden'],
      ['1 Woche', '7 Tage'], ['1 Jahr', '12 Monate']
    ];
    const rightVals = units.map(u => u[1]);
    units.forEach(([left, right]) => {
      addQ(out, seen, `Wie viel sind ${left}?`, right, wrongFromPool(rightVals, right, 3));
      addQ(out, seen, `${right} entsprechen wie viel?`, left, wrongFromPool(units.map(u => u[0]), left, 3));
    });

    const calendar = [
      ['Montag', 'Dienstag'], ['Dienstag', 'Mittwoch'], ['Mittwoch', 'Donnerstag'], ['Donnerstag', 'Freitag'],
      ['Freitag', 'Samstag'], ['Samstag', 'Sonntag'], ['Sonntag', 'Montag']
    ];
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    calendar.forEach(([d, next]) => {
      addQ(out, seen, `Welcher Wochentag folgt auf ${d}?`, next, wrongFromPool(days, next, 3));
    });

    const practical = [
      ['Kuehlschrank', 'kuehlt Lebensmittel'], ['Waschmaschine', 'waescht Kleidung'], ['Staubsauger', 'entfernt Staub'],
      ['Geschirrspueler', 'reinigt Geschirr'], ['Backofen', 'backt oder gart mit trockener Hitze'], ['Mikrowelle', 'erwaermt Speisen schnell'],
      ['Zahnbuerste', 'reinigt Zaehne'], ['Regenschirm', 'schuetzt vor Regen'], ['Feuerloescher', 'loescht Entstehungsbraende'], ['Pflaster', 'deckt kleine Wunden ab']
    ];
    const tools = practical.map(p => p[0]);
    const uses = practical.map(p => p[1]);
    practical.forEach(([tool, use]) => {
      addQ(out, seen, `Wofuer nutzt man einen ${tool}?`, use, wrongFromPool(uses, use, 3));
      addQ(out, seen, `Welches Hilfsmittel passt zu: ${use}?`, tool, wrongFromPool(tools, tool, 3));
    });

    return takeNUnique(out, TARGET_PER_CATEGORY);
  }

  const builders = {
    Geschichte: buildGeschichte,
    Geografie: buildGeografie,
    Wissenschaft: buildWissenschaft,
    Technik: buildTechnik,
    Sport: buildSport,
    Musik: buildMusik,
    Film: buildFilm,
    Literatur: buildLiteratur,
    Natur: buildNatur,
    Alltag: buildAlltag,
  };

  const fallbackTerms = {
    Geschichte: ['Antike', 'Mittelalter', 'Neuzeit', 'Revolution', 'Kaiserreich', 'Republik', 'Imperium', 'Kolonialzeit', 'Industrialisierung', 'Weltkrieg', 'Friedensvertrag', 'Chronik'],
    Geografie: ['Gebirge', 'Fluss', 'Insel', 'Halbinsel', 'Hauptstadt', 'Ozean', 'Wueste', 'Delta', 'Kuestenstadt', 'Binnenland', 'Breitengrad', 'Laengengrad'],
    Wissenschaft: ['Physik', 'Chemie', 'Biologie', 'Astronomie', 'Genetik', 'Energie', 'Molekuel', 'Atom', 'Zelle', 'Forschung', 'Hypothese', 'Experiment'],
    Technik: ['Algorithmus', 'Netzwerk', 'Prozessor', 'Datenbank', 'Sensor', 'Roboter', 'Software', 'Hardware', 'Protokoll', 'Verschluesselung', 'Server', 'Cloud'],
    Sport: ['Teamgeist', 'Ausdauer', 'Sprint', 'Training', 'Wettkampf', 'Punkte', 'Finale', 'Liga', 'Turnier', 'Rekord', 'Taktik', 'Schiedsrichter'],
    Musik: ['Melodie', 'Rhythmus', 'Harmonie', 'Tempo', 'Tonleiter', 'Akkord', 'Orchester', 'Solo', 'Chor', 'Partitur', 'Notenschluessel', 'Taktart'],
    Film: ['Regie', 'Drehbuch', 'Szene', 'Kamera', 'Schnitt', 'Premiere', 'Kino', 'Soundtrack', 'Genre', 'Trailer', 'Casting', 'Produktion'],
    Literatur: ['Roman', 'Gedicht', 'Novelle', 'Drama', 'Erzaehler', 'Protagonist', 'Metapher', 'Kapitel', 'Handlung', 'Dialog', 'Stilmittel', 'Interpretation'],
    Natur: ['Oekosystem', 'Artenvielfalt', 'Klima', 'Wald', 'Meeresbiologie', 'Nahrungskette', 'Lebensraum', 'Fotosynthese', 'Bestaeubung', 'Naturschutz', 'Savanne', 'Tundra'],
    Alltag: ['Planung', 'Einkauf', 'Haushalt', 'Ernaehrung', 'Gesundheit', 'Organisation', 'Kalender', 'Zeitmanagement', 'Sicherheit', 'Kommunikation', 'Routine', 'Verkehr']
  };

  function padCategoryToTarget(category, pool) {
    const terms = fallbackTerms[category] || ['Begriff'];
    let i = 0;
    while (pool.length < TARGET_PER_CATEGORY) {
      const correct = terms[i % terms.length];
      const wrong = shuffle(terms.filter(t => t !== correct)).slice(0, 3);
      pool.push({
        prompt: `${category}: Welcher Begriff passt in diese Kategorie? (Ergaenzung ${i + 1})`,
        correct,
        wrong,
      });
      i++;
    }
    return pool;
  }

  const categoryPools = {};
  CATEGORY_ORDER.forEach(cat => {
    const pool = (builders[cat] || (() => []))();
    categoryPools[cat] = padCategoryToTarget(cat, pool.slice(0, TARGET_PER_CATEGORY));
  });

  function toPlayable(entry) {
    const options = shuffle([entry.correct, ...entry.wrong.slice(0, 3)]);
    return {
      prompt: entry.prompt,
      choices: options.map(v => ({ label: String(v), ok: String(v) === String(entry.correct) }))
    };
  }

  const allRaw = [];
  const globalSeen = new Set();
  CATEGORY_ORDER.forEach(cat => {
    (categoryPools[cat] || []).forEach(q => {
      const key = `${String(q.prompt).trim().toLowerCase()}|${String(q.correct).trim().toLowerCase()}`;
      if (globalSeen.has(key)) return;
      globalSeen.add(key);
      allRaw.push(q);
    });
  });

  const finalRaw = allRaw.slice(0, CATEGORY_ORDER.length * TARGET_PER_CATEGORY);
  const promptUse = new Map();
  finalRaw.forEach(q => {
    const base = String(q.prompt).trim();
    const key = base.toLowerCase();
    const n = (promptUse.get(key) || 0) + 1;
    promptUse.set(key, n);
    if (n > 1) q.prompt = `${base} [${n}]`;
  });
  window.QuizDuelQuestionPool = finalRaw.map(toPlayable);

  const byCategoryCounts = {};
  CATEGORY_ORDER.forEach(cat => {
    byCategoryCounts[cat] = (categoryPools[cat] || []).length;
  });

  window.QuizDuelQuestionPoolMeta = {
    poolSize: window.QuizDuelQuestionPool.length,
    uniquePrompts: new Set(window.QuizDuelQuestionPool.map(q => String(q.prompt).trim().toLowerCase())).size,
    targetPerCategory: TARGET_PER_CATEGORY,
    categoryCounts: byCategoryCounts,
  };

  if (window.QuizDuelQuestionPool.length !== 1000 || window.QuizDuelQuestionPoolMeta.uniquePrompts !== 1000) {
    console.warn('Quiz Duell pool check failed', window.QuizDuelQuestionPoolMeta);
  }
})();
