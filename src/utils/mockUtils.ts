import type { Chat } from '@/types/chatTypes';
import type { Message, MessageAttachment } from '@/types/messageTypes';
import type { User } from '@/types/userTypes';

const DIO_SRC =
  'https://avatars.fastly.steamstatic.com/020e751b71cecafb24d2716b46c5b212930a75ab_full.jpg';
const GYRO_SRC =
  'https://steamuserimages-a.akamaihd.net/ugc/784111175456702019/FA82EEB8C8BEF311A2E8370602C39200ACB2C1F2/?imw=512&&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false';
const JOSEPH_SRC = 'https://static.jojowiki.com/images/9/9f/JosephAvAnim3.png';
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

const mockUsers: User[] = [
  {
    _id: '1',
    username: 'the_world_stops',
    username_lower: 'the_world_stops',
    display_name: 'DIO Brando',
    avatar: DIO_SRC,
    bio: 'WRYYYYYYY! Lord of Evil',
    status: 'online',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    _id: '2',
    username: 'steel_ball_run',
    username_lower: 'steel_ball_run',
    display_name: 'Gyro Zeppeli',
    avatar: GYRO_SRC,
    bio: 'Spinning is justice! 回転は正義だ',
    status: 'online',
    created_at: '2024-02-20T14:45:00Z',
  },
  {
    _id: '3',
    username: 'joestar_legacy',
    username_lower: 'joestar_legacy',
    display_name: 'Joseph Joestar',
    avatar: JOSEPH_SRC,
    bio: 'Your next line is... "Nice to meet you!" そして君の次のセリフは...',
    status: 'dnd',
    created_at: '2024-03-10T09:15:00Z',
  },
];

const jojoMessages: Message[] = [
  {
    _id: '1',
    chat_id: '101',
    sender_id: '201',
    content: "Hey, what's up?",
    edited: false,
    read_by: ['301', '401'],
    reactions: {
      '😂': ['2', '9'],
    },
    attachments: [epsteinAttachment],
    created_at: '2023-10-01T12:34:56Z',
    edited_at: '2023-10-01T12:34:56Z',
    sender_username: 'Dio',
    sender_display_name: 'Dio Brando',
    sender_avatar: DIO_SRC,
  },
  {
    _id: '2',
    chat_id: '101',
    sender_id: '301',
    content: "Hey Dio! I'm doing well, thanks. How about you?",
    edited: false,
    read_by: ['201', '401'],
    reactions: {
      '❤️': ['3'],
      '🔥': ['2', '9'],
    },
    attachments: [],
    created_at: '2023-10-01T12:57:18Z',
    edited_at: '2023-10-01T12:57:18Z',
    sender_username: 'Gyro',
    sender_display_name: 'Gyro Zeppeli',
    sender_avatar: GYRO_SRC,
  },
  {
    _id: '3',
    chat_id: '102',
    sender_id: '401',
    content: 'Hey Dio! This is a test message.',
    edited: false,
    read_by: ['201', '301'],
    reactions: {
      '👍': ['3'],
      '🎉': ['2'],
    },
    attachments: [],
    created_at: '2023-10-01T13:09:45Z',
    edited_at: '2023-10-01T13:09:45Z',
    sender_username: 'Joseph',
    sender_display_name: 'Joseph Joestar',
    sender_avatar: JOSEPH_SRC,
  },
];

// ============ MOCK CHATS ============
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
      created_at: '2024-03-15T11:20:00Z',
      edited_at: '2024-03-15T11:20:00Z',
      edited: false,
      read_by: [],
      reactions: {},
      attachments: [],
    },
  },
  {
    _id: 'chat_2',
    created_at: '2024-03-10T08:00:00Z',
    participants: [mockUsers[0]._id, mockUsers[2]._id],
    otherUser: mockUsers[0],
    disappearing_minutes: 5,
    last_message: {
      _id: 'msg_2',
      chat_id: 'chat_2',
      sender_id: '2',
      content: 'Spinning is justice!',
      created_at: '2024-03-15T10:45:00Z',
      edited_at: '2024-03-15T11:20:00Z',
      edited: false,
      read_by: [],
      reactions: {},
      attachments: [],
    },
  },
];

export { jojoMessages, mockUsers, mockChats, DIO_SRC, GYRO_SRC, JOSEPH_SRC };
