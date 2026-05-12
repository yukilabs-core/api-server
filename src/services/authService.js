import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

class AuthService {
  async login(email, password) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    const accessToken = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { user_id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', decoded.user_id)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      const newAccessToken = jwt.sign(
        {
          user_id: decoded.user_id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { access_token: newAccessToken };
    } catch (err) {
      throw new Error('Invalid refresh token');
    }
  }
}

export default new AuthService();
