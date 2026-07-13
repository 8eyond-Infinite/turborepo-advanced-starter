module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testEnvironment: 'node',
    testRegex: '.e2e-spec.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    moduleNameMapper: {
        '^@iam/(.*)$': '<rootDir>/src/contexts/iam/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    },
    globalSetup: '<rootDir>/test/global-setup.ts',
};