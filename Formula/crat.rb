class Crat < Formula
  desc "Solana Vanity Address Generator CLI"
  homepage "https://github.com/asticrat/crat"
  url "https://registry.npmjs.org/crat-cli/-/crat-cli-1.0.1.tgz"
  sha256 "8b5c98d5d93e7774cd09aa9cc261929ffa8844fadbb6243d63075c4ddc9ef9d9"
  license "ISC"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/crat", "--help"
  end
end
