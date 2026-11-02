# CI/CD Workflow for Node.js Application

This repository contains a CI/CD workflow to automate the testing, building, and deployment of a Node.js application. The backend is managed by Node.js, and the frontend uses modern JavaScript frameworks. The CI/CD process is handled using GitHub Actions, ensuring smooth integration and continuous delivery.

## Workflow Overview

The workflow is triggered on every push to the `main` branch. It consists of several jobs:

1. **Backend Tests**
2. **Frontend Checks**
3. **Frontend Build**
4. **Frontend Build for E2E Testing**
5. **End-to-End (E2E) Tests**
6. **Deployment**

## Environment Variables

The workflow uses the following environment variables:

- `SERVER_USER`: SSH user for the server, stored in GitHub Secrets.
- `SERVER_IP`: IP address of the server, stored in GitHub Secrets.

## Workflow Details

### 1. Backend Tests

This job runs backend tests, checks code quality, and audits vulnerabilities.

```yaml
tests_backend:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: server
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: server/package-lock.json

    - name: Install Dependencies
      run: npm ci --prefer-offline

    - name: Run Tests
      run: npm run test:ci

    - name: Lint Code
      run: npm run lint

    - name: Audit Vulnerabilities
      run: npm audit

    - name: Upload Coverage Report to Codecov
      uses: codecov/codecov-action@v3
      env:
        CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

### 2. Frontend Checks

This job performs linting and vulnerability checks on the frontend code.

```yaml
checks_frontend:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        cache: 'npm'
        cache-dependency-path: client/package-lock.json

    - name: Install Dependencies
      run: npm ci --prefer-offline

    - name: Audit Vulnerabilities
      run: cd client && npm audit

    - name: Lint Code
      run: cd client && npm run lint
```

### 3. Frontend Build

This job builds the frontend application.

```yaml
build_frontend:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: client
  needs: [checks_frontend]
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        cache: 'npm'
        cache-dependency-path: client/package-lock.json

    - name: Install Dependencies
      run: npm ci --prefer-offline

    - name: Build Frontend
      run: npm run build

    - name: Archive Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: frontend-dist
        path: client/dist/
        retention-days: 1
```

### 4. Frontend Build for E2E Testing

This job builds the frontend specifically for end-to-end testing.

```yaml
build_frontend_e2e:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: client
  needs: [checks_frontend]
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        cache: 'npm'
        cache-dependency-path: client/package-lock.json

    - name: Install Dependencies
      run: npm ci --prefer-offline

    - name: Build Frontend for E2E
      run: npm run build:e2e

    - name: Archive Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: frontend-dist-e2e
        path: client/dist/
        retention-days: 1
```

### 5. End-to-End (E2E) Tests

This job runs end-to-end tests across multiple browsers.

```yaml
test_e2e:
  runs-on: ubuntu-latest
  needs: [build_frontend_e2e]
  strategy:
    matrix:
      browser: ["chrome", "firefox", "edge"]
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        cache: 'npm'
        cache-dependency-path: server/package-lock.json

    - name: Download Frontend Artifact for E2E
      uses: actions/download-artifact@v3
      with:
        name: frontend-dist-e2e
        path: ./client/dist

    - name: Install Server Dependencies
      run: cd server && npm ci --prefer-offline

    - name: Start Backend Server
      run: cd server && node index.js &

    - name: Run Cypress Tests
      uses: cypress-io/github-action@v6
      with:
        working-directory: client
        browser: ${{ matrix.browser }}
        start: npm run preview
        wait-on: http://localhost:4173
        wait-on-timeout: 60
        config: baseUrl=http://localhost:4173

    - name: Upload Coverage Report to Codecov
      if : matrix.browser == 'chrome' # to avoid uploading multiple times
      uses: codecov/codecov-action@v3
      env:
        CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

### 6. Deployment

This job deploys the application to the server after all tests have passed.

```yaml
deploy:
  needs: [test_e2e, build_frontend, tests_backend]
  runs-on: ubuntu-latest
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Download Frontend Artifact
      uses: actions/download-artifact@v3
      with:
        name: frontend-dist
        path: ./dist

    - name: Deploy to Server
      run: |
        eval $(ssh-agent -s)
        ssh-add - <<< "${{ secrets.OVH_PROD_PKEY }}"
        mkdir -p ~/.ssh
        ssh-keyscan -H ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts
        scp -r ./dist ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:/var/www
        scp -r ./server ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:/var/www
        ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} "cd /var/www/server && npm install --omit=dev"
        ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} "cd /var/www/server && pm2 startOrRestart ecosystem.config.js --env production && pm2 save"
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contact

For any inquiries or feedback, please contact Ismail Mouyahada at [ismail-mouyahada@gmail.com](mailto:ismail-mouyahada@gmail.com).

 

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fghostland-dev%2Fgithub-actions-demo&root-directory=client)

Click the button to deploy your own copy on Vercel in one step.

The app lives in the `client` folder, which the button sets as the Vercel root directory.
