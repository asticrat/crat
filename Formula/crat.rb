class Crat < Formula
  desc "Solana Vanity Address Generator CLI"
  homepage "https://github.com/asticrat/crat"
  url "https://registry.npmjs.org/crat-cli/-/crat-cli-1.0.2.tgz"
  sha256 "05189ce6e3e92a9bdbb6fed07f32fa3a282a9defa082a37d70462255aed19e74"
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
