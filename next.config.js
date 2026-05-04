/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/resetpassword",
        destination: "/reset-password",
        permanent: false,
      },
      {
        source: "/password-reset",
        destination: "/reset-password",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
