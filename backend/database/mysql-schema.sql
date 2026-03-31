CREATE TABLE customers (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(160) NOT NULL
);

CREATE TABLE pets (
  id VARCHAR(32) PRIMARY KEY,
  customerId VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  species VARCHAR(60) NOT NULL,
  breed VARCHAR(120) NOT NULL,
  notes TEXT NULL,
  CONSTRAINT fk_pets_customer FOREIGN KEY (customerId) REFERENCES customers (id)
);

CREATE TABLE services (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  durationMinutes INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE appointments (
  id VARCHAR(32) PRIMARY KEY,
  customerId VARCHAR(32) NOT NULL,
  petId VARCHAR(32) NOT NULL,
  serviceId VARCHAR(32) NOT NULL,
  startsAt DATETIME NOT NULL,
  status ENUM('confirmado', 'pendente', 'concluido', 'cancelado') NOT NULL DEFAULT 'pendente',
  reminderSent TINYINT(1) NOT NULL DEFAULT 0,
  hiddenFromQueue TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_appointments_customer FOREIGN KEY (customerId) REFERENCES customers (id),
  CONSTRAINT fk_appointments_pet FOREIGN KEY (petId) REFERENCES pets (id),
  CONSTRAINT fk_appointments_service FOREIGN KEY (serviceId) REFERENCES services (id)
);

CREATE TABLE charges (
  id VARCHAR(32) PRIMARY KEY,
  appointmentId VARCHAR(32) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid TINYINT(1) NOT NULL DEFAULT 0,
  method ENUM('pix', 'cartao', 'dinheiro') NOT NULL,
  CONSTRAINT fk_charges_appointment FOREIGN KEY (appointmentId) REFERENCES appointments (id)
);
