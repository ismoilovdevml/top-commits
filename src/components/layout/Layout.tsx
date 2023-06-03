import Navbar from "../navbar/Navbar";
import { LayoutProps } from "./Layout.props";

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <header>
        <Navbar />
      </header>
      {children}
    </>
  );
};

export default Layout;
