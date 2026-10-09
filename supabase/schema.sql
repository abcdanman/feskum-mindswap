-- MindSwap @ FESKUM 2026 Database Schema & Initial Seed Data

-- 1. VISITORS (Anonymous Identity)
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY,
  display_name TEXT NULL,
  device_fingerprint TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CHECKPOINTS (Exhibition Booths)
CREATE TABLE IF NOT EXISTS public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Exhibition',
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT NULL,
  qr_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BOOTH VISITS (Stamps, Ratings & Reviews)
CREATE TABLE IF NOT EXISTS public.booth_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NULL,
  visited_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_visitor_checkpoint UNIQUE(visitor_id, checkpoint_id)
);

-- 4. REWARD SETTINGS
CREATE TABLE IF NOT EXISTS public.reward_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Laluan Aspirasi Passport Reward',
  stamp_threshold INT NOT NULL DEFAULT 8,
  description TEXT NOT NULL DEFAULT 'Collect stamps from exhibition booths to unlock your exclusive MindSwap 2026 souvenir!',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. VISITOR REWARDS (Unlocked & Claimed status)
CREATE TABLE IF NOT EXISTS public.visitor_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.reward_settings(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('unlocked', 'claimed')) DEFAULT 'unlocked',
  claimed_at TIMESTAMPTZ NULL,
  claimed_by_staff TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_visitor_reward UNIQUE(visitor_id, reward_id)
);

-- 6. SPEAKERS (UM Talk 16 Speakers)
CREATE TABLE IF NOT EXISTS public.speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  organisation TEXT NOT NULL,
  bio TEXT NOT NULL,
  photo_url TEXT NULL,
  session_title TEXT NOT NULL,
  session_time TEXT NOT NULL,
  session_date TEXT DEFAULT '11-12 Nov 2026',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. VOTING EVENTS
CREATE TABLE IF NOT EXISTS public.voting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'UM Talk People Choice Award 2026',
  description TEXT DEFAULT 'Cast your vote for the speaker who inspired you the most!',
  is_active BOOLEAN DEFAULT true,
  voting_rule TEXT DEFAULT 'one_per_visitor',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. SPEAKER VOTES
CREATE TABLE IF NOT EXISTS public.speaker_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  voting_event_id UUID NOT NULL REFERENCES public.voting_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_visitor_voting_event UNIQUE(visitor_id, voting_event_id)
);

-- PERFORMANCE INDEXES (FOR 400+ CONCURRENT USERS)
CREATE INDEX IF NOT EXISTS idx_checkpoints_qr_token ON public.checkpoints(qr_token);
CREATE INDEX IF NOT EXISTS idx_checkpoints_active ON public.checkpoints(is_active);
CREATE INDEX IF NOT EXISTS idx_booth_visits_visitor ON public.booth_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_booth_visits_checkpoint ON public.booth_visits(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_speaker_votes_speaker ON public.speaker_votes(speaker_id);
CREATE INDEX IF NOT EXISTS idx_speaker_votes_visitor ON public.speaker_votes(visitor_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_votes ENABLE ROW LEVEL SECURITY;

-- POLICIES (Allow public access for anonymous visitors + anon API key)
CREATE POLICY "Public visitors can register/view visitors" ON public.visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public visitors can view active checkpoints" ON public.checkpoints FOR SELECT USING (true);
CREATE POLICY "Public visitors can CRUD booth_visits" ON public.booth_visits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public visitors can view reward settings" ON public.reward_settings FOR SELECT USING (true);
CREATE POLICY "Public visitors can CRUD visitor rewards" ON public.visitor_rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public visitors can view speakers" ON public.speakers FOR SELECT USING (true);
CREATE POLICY "Public visitors can view voting events" ON public.voting_events FOR SELECT USING (true);
CREATE POLICY "Public visitors can vote for speakers" ON public.speaker_votes FOR ALL USING (true) WITH CHECK (true);

-- SEED DATA (DEFAULT REWARD THRESHOLD & VOTING EVENT)
INSERT INTO public.reward_settings (id, title, stamp_threshold, description, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Laluan Aspirasi Passport Reward', 8, 'Complete 8 exhibition booth checkpoints to unlock your official MindSwap @ FESKUM 2026 souvenir!', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.voting_events (id, title, description, is_active, voting_rule)
VALUES ('00000000-0000-0000-0000-000000000002', 'UM Talk People Choice Award 2026', 'Vote for your most inspiring speaker at UM Talk Laluan Aspirasi.', true, 'one_per_visitor')
ON CONFLICT (id) DO NOTHING;

-- SEED DATA: 12 EXHIBITION BOOTHS (LALUAN ASPIRASI)
INSERT INTO public.checkpoints (name, faculty, category, description, location, qr_token, display_order)
VALUES
('Robotics & AI Innovation Showcase', 'Faculty of Engineering', 'AI & Robotics', 'Interactive autonomous swarm drones and robotic arm demonstration.', 'Booth A-01, DTC Marquee', 'qr-eng-robotics', 1),
('Quantum Computing & Cyber Defense', 'Faculty of Computer Science & IT', 'Cybersecurity & Tech', 'Hands-on hardware cryptography module & quantum simulation terminal.', 'Booth A-02, DTC Marquee', 'qr-fsktm-quantum', 2),
('Bio-Tech & Tropical Biodiversity Lab', 'Faculty of Science', 'Biotechnology', 'Live bioluminescent flora showcase and micro-algae biofuel prototype.', 'Booth A-03, DTC Marquee', 'qr-science-biotech', 3),
('Zero-Carbon Urban Farming', 'Faculty of Built Environment', 'Sustainability', 'Hydroponic smart farm wall powered by solar micro-grids.', 'Booth A-04, DTC Marquee', 'qr-fab-greenfarm', 4),
('Bionic Prosthetics & Neural Sensing', 'Faculty of Medicine', 'HealthTech', 'Mind-controlled prosthetic grip prototype and real-time EEG biofeedback.', 'Booth B-01, DTC Marquee', 'qr-med-bionics', 5),
('Nano-Material Dental Regenerators', 'Faculty of Dentistry', 'MedTech', 'Bio-active glass matrix display for zero-pain enamel repair.', 'Booth B-02, DTC Marquee', 'qr-dent-nanomed', 6),
('Heritage Digital Archiving & AI VR', 'Faculty of Arts & Social Sciences', 'Digital Humanities', 'Immersive VR journey through ancient Southeast Asian maritime trade routes.', 'Booth B-03, DTC Marquee', 'qr-fass-vrheritage', 7),
('Clean Energy Battery Tech & Graphene', 'Faculty of Pharmacy', 'Green Energy', 'Graphene supercapacitor rapid charging station demo.', 'Booth B-04, DTC Marquee', 'qr-pharm-graphene', 8),
('Inclusive EdTech & Sign AI Translator', 'Faculty of Education', 'EdTech & Social Impact', 'Real-time camera sign language translation app for inclusive classrooms.', 'Booth C-01, DTC Marquee', 'qr-edu-signai', 9),
('FinTech AI Fraud Detection Sandbox', 'Faculty of Business & Economics', 'FinTech', 'Interactive algorithmic trading simulation and anti-money laundering AI.', 'Booth C-02, DTC Marquee', 'qr-fbe-fintech', 10),
('Smart Legal Contract AI Assistant', 'Faculty of Law', 'LegalTech', 'Automated dispute resolution assistant and blockchain notary demo.', 'Booth C-03, DTC Marquee', 'qr-law-smartcontract', 11),
('UM Makerspace Hardware Prototyping', 'UM Makers Club', 'Maker Space', '3D printing live station, PCB prototyping, and custom laser cutting booth.', 'Booth C-04, DTC Marquee', 'qr-makers-hardware', 12)
ON CONFLICT (qr_token) DO NOTHING;

-- SEED DATA: 16 UM TALK SPEAKERS
INSERT INTO public.speakers (name, position, organisation, bio, photo_url, session_title, session_time, display_order)
VALUES
('Prof. Dr. Imran Al-Hadi', 'Chair of AI Research', 'Faculty of Computer Science & IT', 'Pioneer in ethical artificial intelligence and neural network safety architectures in Southeast Asia.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', 'Building Ethical AI for Next-Gen Society', '10:00 AM - 10:30 AM', 1),
('Dr. Aisha Tan Sri Razak', 'Senior Research Fellow', 'Faculty of Science', 'Leading researcher in micro-algae biofuels and marine conservation genetics.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80', 'Clean Ocean Energy: The Biofuel Revolution', '10:30 AM - 11:00 AM', 2),
('Ir. Dr. Farhan Azman', 'Founder & Director', 'UM Robotics & Swarm Lab', 'Innovator behind autonomous disaster recovery drone swarms deployed nationwide.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', 'Autonomous Drone Swarms in Emergency Response', '11:00 AM - 11:30 AM', 3),
('Dr. Maya Lin', 'Head of Bio-Electronics', 'Faculty of Engineering', 'Expert in neural interface sensors and brain-computer interfaces for mobility restoration.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80', 'Brain-Computer Interfaces: Merging Mind & Machine', '11:30 AM - 12:00 PM', 4),
('Prof. Dato Dr. Zulkifli Rahman', 'Professor of Cyber Law', 'Faculty of Law', 'International consultant on cross-border data privacy laws and AI regulation.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80', 'Governing the Digital Frontier: Tech Law 2030', '12:00 PM - 12:30 PM', 5),
('Dr. Sarah Jessica Voon', 'Founder', 'GreenUrban Solutions UM', 'Architect of zero-carbon vertical farms in high-density urban centers.', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80', 'Zero-Carbon Cities: Micro-Farms in Urban Spaces', '01:30 PM - 02:00 PM', 6),
('Ahmad Danish Rizal', 'President & Student Lead', 'UM Makers Club', 'Undergraduate student innovator who built low-cost 3D printed prosthetic hands for children.', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80', 'Youth Innovation: From Dorm Room to Prototype', '02:00 PM - 02:30 PM', 7),
('Dr. Suresh Pillai', 'Principal Investigator', 'Nanotechnology Institute UM', 'Specialist in graphene energy storage cells and solid-state battery technology.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80', 'Graphene Batteries: Supercharging the Future', '02:30 PM - 03:00 PM', 8),
('Dr. Nurul Huda Hashim', 'Director of EdTech', 'Faculty of Education', 'Creator of AI sign-language translation technology for inclusive classrooms.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80', 'Inclusive Classrooms Powered by Computer Vision', '03:00 PM - 03:30 PM', 9),
('Prof. Dr. Benjamin Lee', 'Dean of FinTech Research', 'Faculty of Business & Economics', 'Advisor on algorithmic risk models and decentralized financial networks.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80', 'AI FinTech & DeFI: Transforming ASEAN Markets', '03:30 PM - 04:00 PM', 10),
('Dr. Kavitha Subramaniam', 'Senior Specialist', 'UM Medical Center', 'Leader in non-invasive neural biomarkers for early diagnosis of neurological conditions.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80', 'Early Diagnostic Biomarkers: AI in Healthcare', '04:00 PM - 04:30 PM', 11),
('Dr. Johan Ariff', 'Head of VR Heritage Lab', 'Faculty of Arts & Social Sciences', 'Specialist in spatial computing, 3D scanning, and digital preservation of heritage.', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80', 'Metaverse Heritage: Preserving History in 3D', '04:30 PM - 05:00 PM', 12),
('Nur Hamizah Binti Razali', 'Tech Lead', 'UM Women in STEM', 'Advocate for diversity in hardware engineering and open-source robotics.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80', 'Empowering Women in DeepTech & Hardware Engineering', '05:00 PM - 05:30 PM', 13),
('Dr. Alex Wong Cheng', 'Lead Researcher', 'Quantum Information Center UM', 'Explores topological qubits and quantum cryptography protocols.', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80', 'Demystifying Quantum Computing for Engineers', '05:30 PM - 06:00 PM', 14),
('Dr. Zarina Mansor', 'Director of Sustainability', 'UM Sustainability Office', 'Architect of UM campus zero-waste initiative and circular economy frameworks.', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80', 'Circular Economy Frameworks for Higher Education', '06:00 PM - 06:30 PM', 15),
('Dato Dr. Amiruddin Harun', 'Guest Keynote Speaker', 'Ministry of Science & Innovation', 'Keynote address on national deep tech incubation policies and startup funding.', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80', 'Malaysia Deep Tech Vision 2030', '06:30 PM - 07:00 PM', 16);
