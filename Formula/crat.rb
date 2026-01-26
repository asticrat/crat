class Crat < Formula
  desc "Solana Vanity Address Generator CLI"
  homepage "https://github.com/asticrat/crat"
  url "https://registry.npmjs.org/crat-cli/-/crat-cli-1.1.1.tgz"
  sha256 "9ef5df928f9ac69e21ca262bf8e1bc35dc64fd5a4a4dd9311050f045339be5d9"
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
