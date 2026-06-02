/**
 * Venue-specific details for fixed-location activities.
 * Shown in the "More info" detail sheet.
 */
export interface ActivityVenueDetails {
  address?: string;
  hours?: string;
  website?: string;
  phone?: string;
  admission?: string; // quick cost note beyond the generic estimate
}

export const ACTIVITY_VENUE_DETAILS: Record<string, ActivityVenueDetails> = {

  // ── Barton Creek / Greenbelt ──────────────────────────────────────────────
  'barton-springs-pool': {
    address: '2201 Barton Springs Rd, Austin, TX 78746',
    hours: 'Daily 5 am – 10 pm (pool closes 7–9 am for cleaning)',
    phone: '(512) 974-6300',
    website: 'austintexas.gov/page/barton-springs-pool',
    admission: '$5 adults · $2 kids (under 12)',
  },
  'midnight-swim-barton-springs': {
    address: '2201 Barton Springs Rd, Austin, TX 78746',
    hours: 'Late swim: 9 pm – 10 pm daily',
    phone: '(512) 974-6300',
    admission: '$5 adults',
  },
  'barton-creek-greenbelt-hike': {
    address: 'Barton Creek Greenbelt — enter at Twin Falls: 3755 S Capital of Texas Hwy, Austin, TX 78704',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'barton-creek-rock-climbing': {
    address: 'Barton Creek Greenbelt — Gus Fruh Access: 1900 Barton Hills Dr, Austin, TX 78704',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'barton-hills-trail': {
    address: 'Barton Hills Trailhead: 2200 Barton Hills Dr, Austin, TX 78704',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'night-swim': {
    address: '2201 Barton Springs Rd, Austin, TX 78746',
    hours: 'Night swim: 9 pm – 10 pm daily',
    admission: '$5',
  },

  // ── Lady Bird Lake / Town Lake ────────────────────────────────────────────
  'lady-bird-lake-kayak': {
    address: 'Texas Rowing Center: 1541 W Cesar Chavez St, Austin, TX 78703',
    hours: 'Mon–Fri 6 am – dusk · Sat–Sun 7 am – dusk',
    phone: '(512) 467-7799',
    website: 'texasrowingcenter.com',
    admission: 'Kayak from ~$15/hr · SUP from ~$20/hr',
  },
  'kayaking-lake': {
    address: 'Rowing Dock: 2418 Stratford Dr, Austin, TX 78746',
    hours: 'Daily 7 am – dusk (weather permitting)',
    phone: '(512) 459-0999',
    website: 'rowingdock.com',
    admission: 'Kayak from ~$15/hr',
  },
  'paddleboarding-lake': {
    address: 'Rowing Dock: 2418 Stratford Dr, Austin, TX 78746',
    hours: 'Daily 7 am – dusk',
    phone: '(512) 459-0999',
    admission: 'SUP from ~$20/hr',
  },
  'congress-bridge-bats': {
    address: 'Congress Ave Bridge, 100 Congress Ave, Austin, TX 78701',
    hours: 'Bats emerge ~15–20 min before sunset (March – October)',
    admission: 'Free — bring a blanket for the lawn under the bridge',
  },
  'pfluger-bridge-night': {
    address: 'Pfluger Pedestrian Bridge, 200 Lee Barton Dr, Austin, TX 78704',
    hours: 'Open 24/7',
    admission: 'Free',
  },
  'waterloo-adventures': {
    address: 'Waterloo Kayaks: 625 E 4th St, Austin, TX 78701',
    hours: 'Daily 9 am – 7 pm',
    phone: '(512) 472-4294',
    website: 'waterlooadventures.com',
    admission: 'Kayak from ~$15/hr · Canoe from ~$20/hr',
  },

  // ── Central Austin pools & parks ──────────────────────────────────────────
  'deep-eddy-pool': {
    address: '401 Deep Eddy Ave, Austin, TX 78703',
    hours: 'Varies by season — check austintexas.gov; typically 7 am – 9 pm summer',
    phone: '(512) 472-8546',
    website: 'austintexas.gov/page/deep-eddy-pool',
    admission: '$4 adults · $2 kids',
  },
  'deep-eddy-late': {
    address: '401 Deep Eddy Ave, Austin, TX 78703',
    hours: 'Check austintexas.gov for evening hours',
    admission: '$4 adults',
  },
  'zilker-park-day': {
    address: '2207 Lou Neff Rd, Austin, TX 78746',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'zilker-kite-fly': {
    address: 'Zilker Park Great Lawn: 2207 Lou Neff Rd, Austin, TX 78746',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'mount-bonnell': {
    address: '3800 Mount Bonnell Rd, Austin, TX 78731',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free — 100 steps to the top, worth it',
  },
  'bull-creek-swimming': {
    address: 'Bull Creek District Park: 6701 Lakewood Dr, Austin, TX 78731',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'emma-long-park': {
    address: '1706 City Park Rd, Austin, TX 78730',
    hours: 'Daily 7 am – 10 pm',
    phone: '(512) 346-1831',
    admission: '$5/vehicle on weekends · Free weekdays',
  },
  'mueller-lake-park': {
    address: '4550 Mueller Blvd, Austin, TX 78723',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'shoal-creek-trail': {
    address: 'Shoal Creek Trail (start): 1700 N Lamar Blvd, Austin, TX 78703',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free — 4.5-mile paved trail',
  },
  'slacklining-pease-park': {
    address: 'Pease District Park: 1100 Kingsbury St, Austin, TX 78703',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
  'walnut-creek-mtb': {
    address: 'Walnut Creek Metropolitan Park: 12138 N Lamar Blvd, Austin, TX 78753',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free · 15+ miles of trails',
  },
  'bike-veloway': {
    address: 'Veloway: 4900 La Crosse Ave, Austin, TX 78749',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free · 3.1-mile paved loop, bikes & skates only',
  },
  'mckinney-falls': {
    address: '5808 McKinney Falls Pkwy, Austin, TX 78744',
    hours: 'Daily 8 am – 10 pm',
    phone: '(512) 243-1643',
    admission: '$7/vehicle (day use)',
  },
  'mckinney-falls-swimming': {
    address: '5808 McKinney Falls Pkwy, Austin, TX 78744',
    hours: 'Daily 8 am – 10 pm',
    admission: '$7/vehicle — swim at Upper or Lower Falls',
  },
  'onion-creek-greenbelt': {
    address: 'Onion Creek Metro Park: 6900 Vertex Blvd, Austin, TX 78737',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },

  // ── Lake Travis area ──────────────────────────────────────────────────────
  'volente-beach-waterpark': {
    address: '16107 FM 2769, Austin, TX 78726',
    hours: 'Memorial Day – Labor Day: Fri–Sun 10 am – 7 pm (check for weekday openings)',
    phone: '(512) 258-5109',
    website: 'volente-beach.com',
    admission: '~$25–35/person · kids under 4 free',
  },
  'lake-travis-zipline': {
    address: 'Lake Travis Zipline Adventures: 7601 Bar K Ranch Rd, Austin, TX 78732',
    hours: 'Daily 9 am – 5 pm',
    phone: '(512) 266-6060',
    website: 'laketraviszipadventures.com',
    admission: 'From ~$75/person',
  },
  'hammock-camping-mckinney': {
    address: 'McKinney Falls State Park: 5808 McKinney Falls Pkwy, Austin, TX 78744',
    hours: 'Check-in 2 pm · Check-out 12 pm',
    phone: '(512) 243-1643',
    admission: '$7/night + $20–25 campsite fee',
  },
  'sunrise-barton-creek': {
    address: 'Barton Creek Greenbelt — Twin Falls: 3755 S Capital of Texas Hwy, Austin, TX 78704',
    hours: 'Opens 5 am — get there by sunrise',
    admission: 'Free',
  },

  // ── Hill Country / Road Trips ─────────────────────────────────────────────
  'hamilton-pool': {
    address: '24300 Hamilton Pool Rd, Austin, TX 78738',
    hours: 'Daily 9 am – 6 pm · Reservation required May–September',
    phone: '(512) 264-2740',
    website: 'parks.traviscountytx.gov',
    admission: '$15/vehicle ($25 on weekends)',
  },
  'pedernales-falls': {
    address: '2585 Park Road 6026, Johnson City, TX 78636',
    hours: 'Daily 8 am – 10 pm',
    phone: '(830) 868-7304',
    admission: '$7/person (13+)',
  },
  'krause-springs': {
    address: '424 Springs Rd, Spicewood, TX 78669',
    hours: 'Daily 9 am – 8 pm',
    phone: '(830) 693-4181',
    website: 'krausesprings.net',
    admission: '$10 adults · $7 kids (6–12)',
  },
  'enchanted-rock-hike': {
    address: '16710 Ranch Road 965, Fredericksburg, TX 78624',
    hours: 'Daily 8 am – 10 pm · Entry may pause at capacity',
    phone: '(830) 685-3636',
    admission: '$8/person (13+)',
    website: 'tpwd.texas.gov/state-parks/enchanted-rock',
  },
  'jacobs-well-swim': {
    address: '1699 Mt Sharp Rd, Wimberley, TX 78676',
    hours: 'Thu–Mon 9 am – 6 pm (reservation required)',
    website: 'hazecenter.org/jacobswellpark',
    admission: '$9/person · Advance reservation required',
  },
  'bastrop-state-park-hike': {
    address: '100 Park Road 1A, Bastrop, TX 78602',
    hours: 'Daily 8 am – 10 pm',
    phone: '(512) 321-2101',
    admission: '$7/person (13+)',
  },

  // ── Entertainment / Venues ────────────────────────────────────────────────
  'pinballz-arcade': {
    address: '8940 Research Blvd, Austin, TX 78758',
    hours: 'Mon–Thu 11 am – 11 pm · Fri 11 am – 1 am · Sat 10 am – 1 am · Sun 10 am – 11 pm',
    phone: '(512) 420-8458',
    website: 'pinballz.com',
    admission: 'Free entry · Games 25¢ – $1',
  },
  'main-event': {
    address: '9012 Research Blvd, Austin, TX 78758',
    hours: 'Sun–Thu 11 am – 11 pm · Fri–Sat 11 am – midnight',
    phone: '(512) 821-9000',
    website: 'mainevent.com',
  },
  'top-golf-austin': {
    address: '2700 Esperanza Crossing, Austin, TX 78758',
    hours: 'Mon–Thu 9 am – 11 pm · Fri 9 am – midnight · Sat 8 am – midnight · Sun 9 am – 11 pm',
    phone: '(512) 977-4600',
    website: 'topgolf.com/austin',
    admission: 'Bay rental ~$30–55/hr (split per group)',
  },
  'peter-pan-mini-golf': {
    address: '1207 Barton Springs Rd, Austin, TX 78704',
    hours: 'Sun–Thu 10 am – 11 pm · Fri–Sat 10 am – midnight',
    phone: '(512) 472-1033',
    admission: '$7 adults · $5 kids — cash only',
  },
  'alamo-drafthouse': {
    address: 'Multiple locations — South Lamar: 1120 S Lamar Blvd, Austin, TX 78704',
    hours: 'Varies by show',
    website: 'drafthouse.com/austin',
    admission: '$14–17/ticket · 21+ in bar areas · Dine-in included',
  },
  'austin-bouldering-project': {
    address: '979 Springdale Rd #122, Austin, TX 78702',
    hours: 'Mon–Fri 6 am – 11 pm · Sat 8 am – 11 pm · Sun 8 am – 10 pm',
    phone: '(512) 524-6164',
    website: 'austinboulderingproject.com',
    admission: '$20 day pass · $5 shoe rental',
  },
  'escape-room-austin': {
    address: 'Escape Room Austin: 4631 Airport Blvd #103, Austin, TX 78751',
    hours: 'Daily noon – 10 pm · Book in advance',
    phone: '(512) 900-4533',
    website: 'escaperoomaustin.com',
    admission: '~$30–40/person',
  },
  'blue-starlite-drive-in': {
    address: 'Blue Starlite Mini Urban Drive-In: 500 Dunlap Rd #1, Austin, TX 78754',
    hours: 'Fri–Sun — doors open at sunset',
    website: 'bluestarlitedriveins.com',
    admission: '~$12/person · Book online',
  },
  'hole-in-the-wall': {
    address: '2538 Guadalupe St, Austin, TX 78705',
    hours: 'Daily noon – 2 am',
    phone: '(512) 477-4747',
    admission: 'Free – $10 cover (varies)',
  },

  // ── Sports & Recreation ───────────────────────────────────────────────────
  'austin-fc-soccer-game': {
    address: 'Q2 Stadium: 10414 McKalla Pl, Austin, TX 78758',
    hours: 'Game days only — check schedule',
    website: 'austinfc.com',
    admission: 'Tickets from ~$25',
  },
  'frisbee-disc-golf': {
    address: 'Pease Park Disc Golf: 1100 Kingsbury St, Austin, TX 78703',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free · 9-hole course',
  },
  'disc-golf-zilker': {
    address: 'Zilker Park Disc Golf: 2207 Lou Neff Rd, Austin, TX 78746',
    hours: 'Daily 5 am – 10 pm',
    admission: 'Free',
  },
};
