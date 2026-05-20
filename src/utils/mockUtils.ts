import type { Message, MessageAttachment } from '@/types/messageTypes';

const DIO_SRC =
  'https://avatars.fastly.steamstatic.com/020e751b71cecafb24d2716b46c5b212930a75ab_full.jpg';
const GYRO_SRC =
  'https://steamuserimages-a.akamaihd.net/ugc/784111175456702019/FA82EEB8C8BEF311A2E8370602C39200ACB2C1F2/?imw=512&&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false';
const JOSEPH_SRC = 'https://static.jojowiki.com/images/9/9f/JosephAvAnim3.png';
const epsteinAttachment: MessageAttachment = {
  id: 'id',
  file_id: 'file_id',
  message_id: 'message_id',
  original_name: 'Epstein_files.pdf',
  file_name: 'epstein_files',
  mime_type: 'pdf',
  size: 12345678,
  is_image: false,
  created_at: 'created_at',
};

const jojoMessages: Message[] = [
  {
    id: '1',
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
    updated_at: '2023-10-01T12:34:56Z',
    sender_username: 'Dio',
    sender_display_name: 'Dio Brando',
    sender_avatar: DIO_SRC,
  },
  {
    id: '2',
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
    updated_at: '2023-10-01T12:57:18Z',
    sender_username: 'Gyro',
    sender_display_name: 'Gyro Zeppeli',
    sender_avatar: GYRO_SRC,
  },
  {
    id: '3',
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
    updated_at: '2023-10-01T13:09:45Z',
    sender_username: 'Joseph',
    sender_display_name: 'Joseph Joestar',
    sender_avatar: JOSEPH_SRC,
  },
];

export { jojoMessages, DIO_SRC, GYRO_SRC, JOSEPH_SRC };
