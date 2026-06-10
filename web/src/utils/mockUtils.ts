import type { Chat } from '@/types/chatTypes';
import type { Message, MessageAttachment } from '@/types/messageTypes';
import type { User } from '@/types/userTypes';

// ── Avatar sources ────────────────────────────────────────────────
const DIO_SRC =
  'https://static.jojowiki.com/images/d/d5/latest/20191015214612/DioAvAnim3.png';
const GYRO_SRC =
  'https://static.jojowiki.com/images/0/0e/latest/20200102214116/GyroAv.png';
const JOSEPH_SRC = 'https://static.jojowiki.com/images/9/9f/JosephAvAnim3.png';
const JOTARO_SRC =
  'https://static.jojowiki.com/images/3/31/latest/20191015214758/5JotaroDR.png';
const KIRA_SRC =
  'https://static.jojowiki.com/images/8/84/latest/20251012191436/OraDoraKiraAv.png';
const GIORNO_SRC =
  'https://static.jojowiki.com/images/d/d7/latest/20191015215128/GiornoAvAnim.png';
const BRUNO_SRC =
  'https://static.jojowiki.com/images/d/d4/latest/20191015215945/BrunoAvAnim.png';
const OKUYASU_SRC =
  'https://static.jojowiki.com/images/1/1e/latest/20191015214139/OkuyasuAvAnim.png';

// ── Mock attachment ───────────────────────────────────────────────
const epsteinAttachment: MessageAttachment = {
  _id: '_id',
  file_id: 'file_id',
  message_id: 'message_id',
  original_name: 'Epstein_files.pdf',
  file_name: 'epstein_files',
  mime_type: 'pdf',
  size: 12345678,
  is_image: false,
  created_at: 'created_at',
};

// ── Mock users ────────────────────────────────────────────────────
const mockUsers: User[] = [
  {
    _id: '1',
    username: 'the_world_stops',
    username_lower: 'the_world_stops',
    display_name: 'DIO Brando',
    avatar: DIO_SRC,
    bio: 'WRYYYYYYY! I have surpassed all encryption schemes!',
    status: 'online',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    _id: '2',
    username: 'steel_ball_run',
    username_lower: 'steel_ball_run',
    display_name: 'Gyro Zeppeli',
    avatar: GYRO_SRC,
    bio: 'Spinning is justice! Rotating your keys is justice!',
    status: 'online',
    created_at: '2024-02-20T14:45:00Z',
  },
  {
    _id: '3',
    username: 'joestar_legacy',
    username_lower: 'joestar_legacy',
    display_name: 'Joseph Joestar',
    avatar: JOSEPH_SRC,
    bio: 'Your next line is: "Wow, this app is end-to-end encrypted!"',
    status: 'dnd',
    created_at: '2024-03-10T09:15:00Z',
  },
  {
    _id: '4',
    username: 'yare_yare_daze',
    username_lower: 'yare_yare_daze',
    display_name: 'Jotaro Kujo',
    avatar: JOTARO_SRC,
    bio: 'Yare yare daze... Star Platinum: The Cryptographer.',
    status: 'away',
    created_at: '2024-03-12T08:00:00Z',
  },
  {
    _id: '5',
    username: 'killer_queen',
    username_lower: 'killer_queen',
    display_name: 'Yoshikage Kira',
    avatar: KIRA_SRC,
    bio: 'I just want a quiet life. My key pair is 4096-bit and has no weaknesses.',
    status: 'invisible',
    created_at: '2024-03-14T22:00:00Z',
  },
  {
    _id: '6',
    username: 'golden_wind',
    username_lower: 'golden_wind',
    display_name: 'Giorno Giovanna',
    avatar: GIORNO_SRC,
    bio: 'I, Giorno Giovanna, have a dream — and that dream is perfect forward secrecy.',
    status: 'online',
    created_at: '2024-03-16T11:00:00Z',
  },
  {
    _id: '7',
    username: 'arrivederci',
    username_lower: 'arrivederci',
    display_name: 'Bruno Bucciarati',
    avatar: BRUNO_SRC,
    bio: 'Are you approaching me? My public key will verify your identity.',
    status: 'online',
    created_at: '2024-03-18T09:30:00Z',
  },
  {
    _id: '8',
    username: 'the_hand',
    username_lower: 'the_hand',
    display_name: 'Okuyasu Nijimura',
    avatar: OKUYASU_SRC,
    bio: 'I erased the plaintext with THE HAND. Simple!',
    status: 'offline',
    created_at: '2024-03-20T15:00:00Z',
  },
];

// ── JoJo-themed messages ──────────────────────────────────────────
const jojoMessages: Message[] = [
  {
    _id: '1',
    chat_id: '101',
    sender_id: '1',
    content:
      'WRYYYYYYY! I have established the TLS handshake! Your plaintext is no match for my STAND!',
    edited: false,
    read_by: ['301', '401'],
    reactions: { '😂': ['2', '9'] },
    attachments: [epsteinAttachment],
    created_at: '2024-03-20T12:00:00Z',
    edited_at: '2024-03-20T12:00:00Z',
    sender_username: 'the_world_stops',
    sender_display_name: 'DIO Brando',
    sender_avatar: DIO_SRC,
  },
  {
    _id: '2',
    chat_id: '101',
    sender_id: '2',
    content:
      'LESSON 1 of CIPHER SECURITY: spinning is justice. LESSON 2: always rotate your encryption keys.',
    edited: false,
    read_by: ['201', '401'],
    reactions: { '❤️': ['3'], '🔥': ['2', '9'] },
    attachments: [],
    created_at: '2024-03-20T12:01:00Z',
    edited_at: '2024-03-20T12:01:00Z',
    sender_username: 'steel_ball_run',
    sender_display_name: 'Gyro Zeppeli',
    sender_avatar: GYRO_SRC,
  },
  {
    _id: '3',
    chat_id: '101',
    sender_id: '3',
    content:
      'Your next line is: "Wow, this app actually uses AES-256-GCM and I can\'t read anyone else\'s messages!"',
    edited: false,
    read_by: ['201', '301'],
    reactions: { '👍': ['3'], '🎉': ['2'] },
    attachments: [],
    created_at: '2024-03-20T12:02:00Z',
    edited_at: '2024-03-20T12:02:00Z',
    sender_username: 'joestar_legacy',
    sender_display_name: 'Joseph Joestar',
    sender_avatar: JOSEPH_SRC,
  },
  {
    _id: '4',
    chat_id: '101',
    sender_id: '4',
    content:
      'Yare yare daze... the public key verification failed again. I told you to use RSA-OAEP.',
    edited: false,
    read_by: ['1'],
    reactions: {},
    attachments: [],
    created_at: '2024-03-20T12:03:00Z',
    edited_at: '2024-03-20T12:03:00Z',
    sender_username: 'yare_yare_daze',
    sender_display_name: 'Jotaro Kujo',
    sender_avatar: JOTARO_SRC,
  },
  {
    _id: '5',
    chat_id: '101',
    sender_id: '5',
    content:
      'My name is Yoshikage Kira. My key pair is 4096-bit RSA, and I just want to live a quiet, encrypted life. Killer Queen has already touched that plaintext.',
    edited: false,
    read_by: ['1', '2'],
    reactions: { '💀': ['1', '2', '3'] },
    attachments: [],
    created_at: '2024-03-20T12:04:00Z',
    edited_at: '2024-03-20T12:04:00Z',
    sender_username: 'killer_queen',
    sender_display_name: 'Yoshikage Kira',
    sender_avatar: KIRA_SRC,
  },
  {
    _id: '6',
    chat_id: '101',
    sender_id: '6',
    content:
      'I, Giorno Giovanna, have a dream — and that dream is perfect forward secrecy. Every session key will be ephemeral.',
    edited: false,
    read_by: ['1'],
    reactions: { '✨': ['4', '7'] },
    attachments: [],
    created_at: '2024-03-20T12:05:00Z',
    edited_at: '2024-03-20T12:05:00Z',
    sender_username: 'golden_wind',
    sender_display_name: 'Giorno Giovanna',
    sender_avatar: GIORNO_SRC,
  },
  {
    _id: '7',
    chat_id: '101',
    sender_id: '7',
    content:
      'Are you approaching me? Then come closer — I will verify your identity with ECDSA before you get here.',
    edited: false,
    read_by: ['6'],
    reactions: { '🤝': ['6'] },
    attachments: [],
    created_at: '2024-03-20T12:06:00Z',
    edited_at: '2024-03-20T12:06:00Z',
    sender_username: 'arrivederci',
    sender_display_name: 'Bruno Bucciarati',
    sender_avatar: BRUNO_SRC,
  },
  {
    _id: '8',
    chat_id: '101',
    sender_id: '8',
    content:
      "I erased the plaintext with THE HAND. It's gone. No trace in memory. Simple.",
    edited: false,
    read_by: ['7'],
    reactions: { '👋': ['3', '2'] },
    attachments: [],
    created_at: '2024-03-20T12:07:00Z',
    edited_at: '2024-03-20T12:07:00Z',
    sender_username: 'the_hand',
    sender_display_name: 'Okuyasu Nijimura',
    sender_avatar: OKUYASU_SRC,
  },
  {
    _id: '9',
    chat_id: '101',
    sender_id: '1',
    content:
      'ZA WARUDO! Time stops... but end-to-end encryption never does. This message will self-destruct in 5 minutes.',
    edited: false,
    read_by: [],
    reactions: {},
    attachments: [],
    created_at: '2024-03-20T12:08:00Z',
    edited_at: '2024-03-20T12:08:00Z',
    sender_username: 'the_world_stops',
    sender_display_name: 'DIO Brando',
    sender_avatar: DIO_SRC,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  },
  {
    _id: '10',
    chat_id: '101',
    sender_id: '4',
    content:
      "Good grief... he set a disappearing timer. I'll read it before time resumes.",
    edited: false,
    read_by: ['1'],
    reactions: { '😤': ['1'] },
    attachments: [],
    created_at: '2024-03-20T12:09:00Z',
    edited_at: '2024-03-20T12:09:00Z',
    sender_username: 'yare_yare_daze',
    sender_display_name: 'Jotaro Kujo',
    sender_avatar: JOTARO_SRC,
  },
];

// ── Mock chats ────────────────────────────────────────────────────
const mockChats: Chat[] = [
  {
    _id: 'chat_1',
    created_at: '2024-03-15T11:20:00Z',
    participants: [mockUsers[1]._id, mockUsers[2]._id],
    disappearing_minutes: 5,
    otherUser: mockUsers[2],
    last_message: {
      _id: 'msg_1',
      chat_id: 'chat_1',
      sender_id: '1',
      content: 'WRYYYYYYY!',
      created_at: '2024-03-20T12:08:00Z',
      edited_at: '2024-03-20T12:08:00Z',
      edited: false,
      read_by: [],
      reactions: {},
      attachments: [],
    },
  },
  {
    _id: 'chat_2',
    created_at: '2024-03-10T08:00:00Z',
    participants: [mockUsers[0]._id, mockUsers[3]._id],
    otherUser: mockUsers[3],
    disappearing_minutes: 0,
    last_message: {
      _id: 'msg_2',
      chat_id: 'chat_2',
      sender_id: '4',
      content: 'Yare yare daze...',
      created_at: '2024-03-20T12:09:00Z',
      edited_at: '2024-03-20T12:09:00Z',
      edited: false,
      read_by: [],
      reactions: {},
      attachments: [],
    },
  },
  {
    _id: 'chat_3',
    created_at: '2024-03-18T09:00:00Z',
    participants: [mockUsers[0]._id, mockUsers[5]._id],
    otherUser: mockUsers[5],
    disappearing_minutes: 0,
    last_message: {
      _id: 'msg_3',
      chat_id: 'chat_3',
      sender_id: '6',
      content: 'I have a dream — perfect forward secrecy.',
      created_at: '2024-03-20T12:05:00Z',
      edited_at: '2024-03-20T12:05:00Z',
      edited: false,
      read_by: [],
      reactions: {},
      attachments: [],
    },
  },
  {
    _id: 'chat_4',
    created_at: '2024-03-19T14:00:00Z',
    participants: [mockUsers[0]._id, mockUsers[6]._id],
    otherUser: mockUsers[6],
    disappearing_minutes: 60,
    last_message: {
      _id: 'msg_4',
      chat_id: 'chat_4',
      sender_id: '7',
      content: 'Are you approaching me?',
      created_at: '2024-03-20T12:06:00Z',
      edited_at: '2024-03-20T12:06:00Z',
      edited: false,
      read_by: [],
      reactions: {},
      attachments: [],
    },
  },
];

export {
  jojoMessages,
  mockUsers,
  mockChats,
  DIO_SRC,
  GYRO_SRC,
  JOSEPH_SRC,
  JOTARO_SRC,
  KIRA_SRC,
  GIORNO_SRC,
  BRUNO_SRC,
  OKUYASU_SRC,
};
