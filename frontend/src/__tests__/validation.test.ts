import {
  CAMPUS_ID_LENGTH,
  PASSWORD_MIN_LENGTH,
  campusIdLabel,
  digitsOnly,
  validateAttendance,
  validateCampusId,
  validateFullName,
  validateKnustEmail,
  validatePassword,
  validatePasswordMatch,
} from '../validation';

describe('digitsOnly', () => {
  it('strips letters, punctuation and spaces', () => {
    expect(digitsOnly('STU-2055 1234abc')).toBe('20551234');
  });

  it('leaves a clean numeric string alone', () => {
    expect(digitsOnly('20551234')).toBe('20551234');
  });
});

describe('campusIdLabel', () => {
  it('names the field for the role', () => {
    expect(campusIdLabel('student')).toBe('Student ID');
    expect(campusIdLabel('staff')).toBe('Staff ID');
  });
});

describe('validateCampusId', () => {
  it('accepts an 8-digit student ID and a 9-digit staff ID', () => {
    expect(validateCampusId('student', '20551234')).toBeNull();
    expect(validateCampusId('staff', '200912345')).toBeNull();
  });

  it('rejects an ID of the other role’s length', () => {
    expect(validateCampusId('student', '200912345')).toMatch(/exactly 8 digits/);
    expect(validateCampusId('staff', '20551234')).toMatch(/exactly 9 digits/);
  });

  it('rejects short, long and non-numeric values', () => {
    expect(validateCampusId('student', '2055123')).toMatch(/exactly 8 digits/);
    expect(validateCampusId('student', '205512345')).toMatch(/exactly 8 digits/);
    expect(validateCampusId('student', 'STU12345')).toMatch(/digits only/);
  });

  it('reports an empty value as required, using the role’s label', () => {
    expect(validateCampusId('student', '')).toBe('Student ID is required.');
    expect(validateCampusId('staff', '   ')).toBe('Staff ID is required.');
  });

  it('exempts admins from the digit rules — their numbers are free-form', () => {
    expect(CAMPUS_ID_LENGTH.admin).toBe(0);
    expect(validateCampusId('admin', 'ADMIN001')).toBeNull();
    expect(validateCampusId('admin', '7')).toBeNull();
  });

  it('still requires an admin to supply some ID', () => {
    expect(validateCampusId('admin', '  ')).toBe('Staff ID is required.');
  });
});

describe('validateFullName', () => {
  it('accepts a name', () => {
    expect(validateFullName('Abubakar Sadiq')).toBeNull();
  });

  /**
   * Sign-up used to answer a blank name with a form-wide "fill in all required
   * fields", which named no field to go and fix. It reports on the field now.
   */
  it('reports a blank name against the field itself', () => {
    expect(validateFullName('')).toBe('Full name is required.');
    expect(validateFullName('   ')).toBe('Full name is required.');
  });
});

describe('validateKnustEmail', () => {
  it('accepts knust.edu.gh and its subdomains', () => {
    expect(validateKnustEmail('a.sadiq@st.knust.edu.gh')).toBeNull();
    expect(validateKnustEmail('k.mensah@knust.edu.gh')).toBeNull();
    expect(validateKnustEmail('X.Y@ST.KNUST.EDU.GH')).toBeNull(); // case-insensitive
  });

  it('rejects addresses outside the institution', () => {
    expect(validateKnustEmail('someone@gmail.com')).toMatch(/KNUST email/);
    expect(validateKnustEmail('someone@knust.edu.gh.evil.com')).toMatch(/KNUST email/);
    expect(validateKnustEmail('notanemail')).toMatch(/KNUST email/);
  });

  it('reports an empty value as required', () => {
    expect(validateKnustEmail('  ')).toBe('Email address is required.');
  });
});

describe('validatePassword', () => {
  it('requires the shared minimum length', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(6);
    expect(validatePassword('123456')).toBeNull();
    expect(validatePassword('12345')).toMatch(/at least 6 characters/);
    expect(validatePassword('')).toBe('Password is required.');
  });
});

describe('validatePasswordMatch', () => {
  it('accepts a matching confirmation and rejects a mismatch', () => {
    expect(validatePasswordMatch('password123', 'password123')).toBeNull();
    expect(validatePasswordMatch('password123', 'password124')).toBe('Passwords do not match.');
    expect(validatePasswordMatch('password123', '')).toBe('Please confirm your password.');
  });
});

describe('validateAttendance', () => {
  it('treats an empty value as fine — attendance is optional', () => {
    expect(validateAttendance('', 30)).toBeNull();
    expect(validateAttendance('   ', 30)).toBeNull();
  });

  it('accepts a headcount the room can seat, including exactly full', () => {
    expect(validateAttendance('29', 30)).toBeNull();
    expect(validateAttendance('30', 30)).toBeNull();
  });

  it('rejects more attendees than the room seats, naming the capacity', () => {
    expect(validateAttendance('31', 30)).toMatch(/seats 30/);
  });

  it('rejects zero, negatives and non-integers', () => {
    expect(validateAttendance('0', 30)).toMatch(/above zero/);
    expect(validateAttendance('-5', 30)).toMatch(/above zero/);
    expect(validateAttendance('2.5', 30)).toMatch(/above zero/);
    expect(validateAttendance('abc', 30)).toMatch(/above zero/);
  });
});
