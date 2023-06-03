import Navbar from "../navbar/Navbar";
import { LayoutProps } from "./Layout.props";

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

export default Layout;
