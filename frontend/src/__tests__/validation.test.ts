import {
  CAMPUS_ID_LENGTH,
  PASSWORD_MIN_LENGTH,
  campusIdLabel,
  digitsOnly,
  validateAttendance,
  validateCampusId,
  validateEmail,
  validateFullName,
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
  /**
   * Self-registration spans institutions with their own ID conventions now,
   * so a fixed digit count can't be a platform-wide rule — every role is
   * free-form, the same way admin numbers always have been.
   */
  it('has no fixed digit length for any role', () => {
    expect(CAMPUS_ID_LENGTH.student).toBe(0);
    expect(CAMPUS_ID_LENGTH.staff).toBe(0);
    expect(CAMPUS_ID_LENGTH.admin).toBe(0);
    expect(CAMPUS_ID_LENGTH.platform_admin).toBe(0);
  });

  it('accepts any non-blank id regardless of shape', () => {
    expect(validateCampusId('student', '20551234')).toBeNull();
    expect(validateCampusId('staff', 'STU-2026-001')).toBeNull();
    expect(validateCampusId('admin', 'ADMIN001')).toBeNull();
    expect(validateCampusId('admin', '7')).toBeNull();
  });

  it('reports an empty value as required, using the role’s label', () => {
    expect(validateCampusId('student', '')).toBe('Student ID is required.');
    expect(validateCampusId('staff', '   ')).toBe('Staff ID is required.');
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

describe('validateEmail', () => {
  it('accepts any well-formed address regardless of domain', () => {
    expect(validateEmail('a.sadiq@st.knust.edu.gh')).toBeNull();
    expect(validateEmail('someone@ridgeview.edu')).toBeNull();
    expect(validateEmail('someone@gmail.com')).toBeNull();
  });

  it('rejects a malformed address', () => {
    expect(validateEmail('notanemail')).toMatch(/valid email/);
  });

  it('reports an empty value as required', () => {
    expect(validateEmail('  ')).toBe('Email address is required.');
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
