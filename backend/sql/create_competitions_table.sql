-- Create competitions table
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_fee DECIMAL(10, 2) DEFAULT 0,
    prize_pool DECIMAL(10, 2) DEFAULT 0,
    max_participants INTEGER,
    status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, active, completed, cancelled
    platform VARCHAR(50) DEFAULT 'matchtrader', -- matchtrader, fundingpips
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competition_participants table
CREATE TABLE IF NOT EXISTS competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Assuming user_id links to your auth system's user table
    status VARCHAR(50) DEFAULT 'registered', -- registered, active, disqualified, completed
    score DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(competition_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competition_participants_user_id ON competition_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_competition_id ON competition_participants(competition_id);
