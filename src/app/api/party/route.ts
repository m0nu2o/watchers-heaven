import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPartySchema } from '@/lib/watch-party/validation';
import { generateRoomCode } from '@/lib/watch-party/room-code';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = createPartySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }

    let hostUserId: string = (body && typeof body.guestUserId === 'string' && body.guestUserId) 
      ? body.guestUserId 
      : crypto.randomUUID();

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    if (token) {
      try {
        const authSupabase = createServerSupabaseClient(token);
        const { data: { user } } = await authSupabase.auth.getUser(token);
        if (user?.id) {
          hostUserId = user.id;
        }
      } catch (e) {
        console.warn('Optional auth verification skipped for guest user:', e);
      }
    }

    const supabase = createServerSupabaseClient(token);

    const data = result.data;
    
    // 3. Generate a unique room code
    // In a production app, we might want to check for collisions, 
    // but with 8 base32 chars it's highly unlikely to collide.
    const roomCode = generateRoomCode(8);

    // 4. Insert into database
    const { data: party, error: insertError } = await supabase
      .from('watch_parties')
      .insert({
        room_code: roomCode,
        movie_id: data.movieId,
        movie_title: data.movieTitle,
        media_type: data.mediaType,
        season: data.season ?? null,
        episode: data.episode ?? null,
        provider: data.provider,
        host_user_id: hostUserId,
        playing: false,
        current_time: 0,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create watch party:', insertError);
      return NextResponse.json({ error: 'Failed to create party' }, { status: 500 });
    }

    // 5. Return success
    return NextResponse.json({
      roomCode: party.room_code,
      partyId: party.id,
    });
    
  } catch (error) {
    console.error('Unexpected error in party creation:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
