# Publishing Guide

Follow these steps to make `brew install crat` work for users.

## 1. Publish to NPM
First, the code needs to be hosted where Homebrew can find it. NPM is the easiest way.

1.  Navigate to the CLI directory:
    ```bash
    cd crat-cli
    ```
2.  Login to NPM (if not already):
    ```bash
    npm login
    ```
3.  Publish the package:
    ```bash
    npm publish
    ```
    *Note: Ensure `package.json` has a unique version number.*

## 2. Update the Formula
Once published, you can get the exact tarball URL using `npm view`.

1.  Get the tarball URL:
    ```bash
    npm view crat-cli dist.tarball
    ```
2.  Get the SHA256 of the new file:
    ```bash
    curl -sL $(npm view crat-cli dist.tarball) | shasum -a 256
    ```
2.  Edit `homebrew-crat/Formula/crat.rb`:
    - Update `url` to the actual NPM tarball URL.
    - Update `sha256` with the value you just calculated.

## 3. Publish the Tap
Since you are using your existing `crat` repository:

1.  Ensure `Formula/crat.rb` is committed and pushed to your main branch.
    ```bash
    git add Formula/crat.rb
    git commit -m "Add Homebrew formula"
    git push origin main
    ```

## 4. Install
Your users can now install directly from your repository:

```bash
# Tap your existing repository
brew tap asticrat/crat

# Install the package
brew install crat
```
