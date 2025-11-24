/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { Button, notification, FloatButton, Form, Input, Modal, Avatar, List, Skeleton, Divider, Menu, Dropdown, Popconfirm } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined, ExclamationCircleOutlined, DeleteFilled, EllipsisOutlined } from "@ant-design/icons";
import { GET_BRANCHES, DELETE, GET } from "helpers/api_helper";
import { ADD_BRANCH } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import BranchCollapseContent from "components/Common/BranchCollapseContent";
import "./ListBranch.css";
import InfiniteScroll from "react-infinite-scroll-component";
import { useNavigate } from "react-router-dom";
import branchIcon from "assets/images/location.png";
import SwipeablePanel from "components/Common/SwipeablePanel";
import BranchNameModal from "components/Common/BranchNameModal";

const ListBranch = () => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [branchDetails, setBranchDetails] = useState({});
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedBranches, setDisplayedBranches] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const navigate = useNavigate();
  
  const itemsPerPage = 10;
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false); // NEW: Track initialization

  // NEW: Check if branch was previously selected
  useEffect(() => {
    const savedBranch = localStorage.getItem("selected_branch_name");
    if (savedBranch) {
      setSelectedBranchName(savedBranch);
      setIsInitialized(true);
    } else {
      // Wait for token to be available before showing modal
      const checkToken = () => {
        const token = localStorage.getItem("access_token");
        if (token) {
          setIsInitialized(true);
          setBranchModalVisible(true);
        } else {
          // Retry after 300ms
          setTimeout(checkToken, 300);
        }
      };
      checkToken();
    }
  }, []);

  const handleSaveBranchName = (name) => {
    localStorage.setItem("selected_branch_name", name);
    setSelectedBranchName(name);
    setBranchModalVisible(false);
    window.location.reload();
  };

  const handleCancelBranchModal = () => {
    notification.warning({
      message: "Branch Name Required",
      description: "Please select a branch name to continue",
    });
  };

  // 🧹 Delete branch
  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`${ADD_BRANCH}${record.id}`);

      if (response?.status === 200) {
        setBranches((prev) => prev.filter((item) => item.id !== record.id));
        notification.success({
          message: `${record.branch_name?.toUpperCase()} Branch Deleted!`,
          description: "The branch has been deleted successfully.",
          duration: 2,
        });
      } else {
        notification.error({
          message: "Delete Failed",
          description: "The branch could not be deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting branch:", error);
      notification.error({
        message: "Error",
        description: "An error occurred while deleting the branch.",
      });
    } finally {
      setDeleteLoader(false);
      setShowConfirm(false);
      setOpenSwipeId(null);
    }
  };

  // 📋 Fetch branches list
  const getBranchesList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await GET_BRANCHES(ADD_BRANCH);
      if (response?.status === 200) {
        setBranches(response.data);
        setDisplayedBranches(response.data.slice(0, 10));
        setHasMore(response.data.length > 10);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      getBranchesList();
    } else {
      setTimeout(() => {
        const retryToken = localStorage.getItem("access_token");
        if (retryToken) {
          getBranchesList();
        }
      }, 300);
    }
  }, [getBranchesList]);

  // 🔍 Handle Search Modal Actions
  const showSearchModal = () => setSearchModalVisible(true);
  const handleCancel = () => setSearchModalVisible(false);
  
  const handleSearch = () => {
    const { branchName } = form.getFieldsValue();
    if (!branchName) {
      notification.warning({
        message: "No Input",
        description: "Please enter a branch name to search.",
      });
      return;
    }

    const searchValue = branchName.toLowerCase().trim();
    setSearchTerm(searchValue);

    const filtered = branches.filter(
      (b) => b.branch_name?.toLowerCase().includes(searchValue)
    );

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: "No branches found matching your search.",
      });
    }

    setDisplayedBranches(filtered.slice(0, 10));
    setHasMore(filtered.length > 10);
    setSearchModalVisible(false);
  };

  const handleReset = () => {
    form.resetFields();
    setSearchTerm("");
    setDisplayedBranches(branches.slice(0, itemsPerPage));
    setHasMore(branches.length > itemsPerPage);
    setOpenSwipeId(null);
  };

  const handleAction = async (branch) => {
    setOpenSwipeId(null);
    
    setBranchDetails((prev) => {
      const isAlreadyExpanded = prev[branch.id]?.expanded;

      const newState = {};
      Object.keys(prev).forEach((id) => {
        newState[id] = { ...prev[id], expanded: false };
      });

      newState[branch.id] = {
        expanded: !isAlreadyExpanded,
        data: prev[branch.id]?.data || null,
      };

      return newState;
    });

    if (!branchDetails[branch.id]?.data) {
      try {
        const response = await GET(`/api/branch/${branch.id}/`);
        if (response?.status === 200) {
          setBranchDetails((prev) => ({
            ...Object.fromEntries(
              Object.entries(prev).map(([id, val]) => [
                id,
                { ...val, expanded: false },
              ])
            ),
            [branch.id]: {
              expanded: true,
              data: response.data,
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching branch details:", error);
      }
    }
  };

  const handleSwipeStateChange = (branchId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(branchId);
    } else if (openSwipeId === branchId) {
      setOpenSwipeId(null);
    }
  };

  const renderMenu = (branch) => (
    <Menu>
      <Menu.Item
        key="edit"
        onClick={(e) => {
          e.domEvent.stopPropagation();
          navigate(`/branch/edit/${branch.id}`);
        }}
      >
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-pencil text-secondary mb-0"></span>
          <span>Edit</span>
        </div>
      </Menu.Item>

      <Menu.Item key="delete">
        <Popconfirm
          title={`Delete branch ${branch.branch_name}?`}
          description="Are you sure you want to delete?"
          icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
          onConfirm={(e) => {
            e.stopPropagation();
            onDelete(branch);
          }}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, type: "primary" }}
          cancelButtonProps={{ type: "default" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center gap-1" style={{ color: "red" }}>
            <DeleteFilled style={{ color: "red" }} />
            <span>Delete</span>
          </div>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {
    if (branches.length > 0) {
      setDisplayedBranches(branches.slice(0, itemsPerPage));
    }
  }, [branches]);

  const fetchMoreBranches = () => {
    const nextLength = displayedBranches.length + itemsPerPage;
    if (nextLength >= branches.length) {
      setDisplayedBranches(branches);
      setHasMore(false);
    } else {
      setDisplayedBranches(branches.slice(0, nextLength));
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="page-content" style={{ padding: "0px" }}>
      {loading && <Loader />}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "15px",
          marginBottom: "15px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h2 style={{ marginTop: "-25px", marginBottom: 0, fontSize: "24px", fontWeight: 600 }}>
          All Branches
        </h2>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "-25px" }}>
          <Button
            icon={<SearchOutlined />}
            onClick={showSearchModal}
            className="search-button"
          >
            <span className="search-text">Search</span>
          </Button>

          {searchTerm && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="Reset Search"
            />
          )}
        </div>
      </div>

      <div
        id="scrollableDiv"
        style={{
          height: 500,
          overflow: "auto",
          padding: 0,
          margin: 0,
        }}
      >
        <InfiniteScroll
          dataLength={displayedBranches.length}
          style={{ padding: "10px", margin: 0 }}
          next={fetchMoreBranches}
          hasMore={hasMore}
          loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
          endMessage={
            <Divider plain style={{ margin: "16px 0" }}>
              <span style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}>★ </span>
              <span style={{ color: "#595959", fontSize: "14px" }}>
                End of Branch List
                <span style={{ color: "red", fontSize: "18px", fontWeight: "bold" }}> ★</span>
              </span>
            </Divider>
          }
          scrollableTarget="scrollableDiv"
        >
          {searchTerm && (
            <div
              style={{
                padding: "12px 0px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "left"
              }}
            >
              <span style={{ fontSize: "14px", color: "#8c8c8c" }}>
                Search Results:{" "}
                <span style={{ fontWeight: 600, color: "#1677ff", fontSize: "15px" }}>
                  "{searchTerm}"
                </span>
              </span>
              <span style={{ 
                marginLeft: "12px", 
                fontSize: "13px", 
                color: "#52c41a",
                fontWeight: 500 
              }}>
                ({displayedBranches.length} result{displayedBranches.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
          <List
            dataSource={displayedBranches}
            renderItem={(branch) => {
              const isExpanded = branchDetails[branch.id]?.expanded;
              const details = branchDetails[branch.id]?.data;

              const handleEditBranch = (branch) => {
                setOpenSwipeId(null);
                navigate(`/branch/edit/${branch.id}`);
              };

              const handleDeleteBranch = (branch) => {
                setOpenSwipeId(null);
                onDelete(branch);
              };

              return (
                <div
                  key={branch.id}
                  style={{
                    borderBottom: "2px solid #f0f0f0",
                    padding: 0,
                    marginLeft: "-10px",
                    marginRight: "-10px",
                  }}
                >
                  {isMobile ? (
                    <SwipeablePanel
                      item={branch}
                      index={branch.id}
                      titleKey="branch_name"
                      name="branch"
                      avatarSrc={branchIcon}
                      onSwipeRight={!isExpanded ? () => handleEditBranch(branch) : undefined}
                      onSwipeLeft={!isExpanded ? () => handleDeleteBranch(branch) : undefined}
                      isExpanded={isExpanded}
                      onExpandToggle={() => handleAction(branch)}
                      renderContent={() => (
                        isExpanded ? (
                          <BranchCollapseContent branch={branch} details={details} />
                        ) : null
                      )}
                      isSwipeOpen={openSwipeId === branch.id}
                      onSwipeStateChange={(isOpen) => handleSwipeStateChange(branch.id, isOpen)}
                    />
                  ) : (
                    <>
                      <List.Item
                        style={{
                          background: isExpanded ? "#f9f9f9" : "#fff",
                          cursor: "default",
                        }}
                      >
                        <List.Item.Meta
                          avatar={<Avatar src={branchIcon} />}
                          title={
                            <div
                              onClick={() => handleAction(branch)}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                                cursor: "pointer",
                                padding: "6px 0",
                              }}
                            >
                              <span style={{ fontWeight: 600, color: "black" }}>
                                {branch.branch_name}
                              </span>
                              <Dropdown overlay={renderMenu(branch)} trigger={["click"]}>
                                <EllipsisOutlined
                                  style={{
                                    fontSize: "22px",
                                    color: "#999",
                                    cursor: "pointer",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </Dropdown>
                            </div>
                          }
                        />
                      </List.Item>

                      {isExpanded && details && (
                        <div style={{ marginTop: 6 }}>
                          <BranchCollapseContent branch={branch} details={details} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            }}
          />
        </InfiniteScroll>
      </div>

      <Modal
        title={<div style={{ textAlign: "center", width: "100%" }}>Search Branches</div>}
        open={searchModalVisible}
        onOk={handleSearch}
        onCancel={handleCancel}
        okText="Search"
        cancelText="Cancel"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Branch Name" name="branchName">
            <Input
              placeholder="Enter branch name to search"
              allowClear
              onChange={(e) => {
                const value = e.target.value.trim();
                if (value === "") {
                  setFilteredBranches([]);
                  getBranchesList();
                }
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          position: "fixed",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
        onClick={() => (window.location.href = "/branch/add")}
        tooltip="Add New Branch"
      />

      {/* Only show modal when initialized and token is ready */}
      {isInitialized && (
        <BranchNameModal
          visible={branchModalVisible}
          onSave={handleSaveBranchName}
          onCancel={handleCancelBranchModal}
        />
      )}
    </div>
  );
};

export default ListBranch;
