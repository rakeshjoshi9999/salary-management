-- Supported countries, departments and job titles (docs/DATA_MODEL.md, ADR-008).
-- A change to this list is a new migration modelled on this one, never an edit here.

INSERT INTO country (code, name, currency_code) VALUES
    ('US', 'United States',  'USD'),
    ('GB', 'United Kingdom', 'GBP'),
    ('IN', 'India',          'INR'),
    ('DE', 'Germany',        'EUR'),
    ('FR', 'France',         'EUR');

INSERT INTO department (name) VALUES
    ('Engineering'),
    ('Sales'),
    ('Marketing'),
    ('Finance'),
    ('Human Resources'),
    ('Operations');

INSERT INTO job_title (name, department) VALUES
    ('Software Engineer',        'Engineering'),
    ('Senior Software Engineer', 'Engineering'),
    ('QA Engineer',              'Engineering'),
    ('Engineering Manager',      'Engineering'),
    ('Sales Representative',     'Sales'),
    ('Account Executive',        'Sales'),
    ('Sales Manager',            'Sales'),
    ('Marketing Specialist',     'Marketing'),
    ('Content Strategist',       'Marketing'),
    ('Marketing Manager',        'Marketing'),
    ('Accountant',               'Finance'),
    ('Financial Analyst',        'Finance'),
    ('Finance Manager',          'Finance'),
    ('HR Generalist',            'Human Resources'),
    ('Recruiter',                'Human Resources'),
    ('HR Manager',               'Human Resources'),
    ('Operations Analyst',       'Operations'),
    ('Operations Manager',       'Operations');
